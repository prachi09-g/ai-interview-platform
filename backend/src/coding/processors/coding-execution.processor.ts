import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import { Judge0ClientService } from '../ai/judge0-client.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface RunSubmissionJobData {
  submissionId: string;
}

// Judge0 status.id 3 = "Accepted". Anything else (Wrong Answer, Compile
// Error, Runtime Error, Time Limit Exceeded, ...) counts as not-passed
// for this test case.
const JUDGE0_ACCEPTED_STATUS_ID = 3;

@Processor(QUEUE_NAMES.CODING_EXECUTION)
export class CodingExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(CodingExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly judge0ClientService: Judge0ClientService,
    private readonly achievementsService: AchievementsService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<RunSubmissionJobData>): Promise<void> {
    const { submissionId } = job.data;

    const submission = await this.prisma.codingSubmission.findUnique({
      where: { id: submissionId },
      include: { codingQuestion: true },
    });

    if (!submission) {
      this.logger.warn(`Submission ${submissionId} not found — skipping`);
      return;
    }

    await this.prisma.codingSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.RUNNING },
    });

    const languageId = this.judge0ClientService.resolveLanguageId(submission.language);
    if (!languageId) {
      await this.markError(submissionId, submission.userId);
      this.logger.error(`Unsupported language "${submission.language}" on submission ${submissionId}`);
      return;
    }

    const testCases = submission.codingQuestion.testCases as { input: string; expectedOutput: string }[];

    try {
      const results = await this.judge0ClientService.runTestCases(submission.code, languageId, testCases);

      const passedCount = results.filter((r) => r.statusId === JUDGE0_ACCEPTED_STATUS_ID).length;
      const score = Math.round((passedCount / testCases.length) * 100);
      const runtimeMs = Math.round(Math.max(...results.map((r) => (r.timeSeconds ?? 0) * 1000), 0));

      const status = passedCount === testCases.length ? SubmissionStatus.PASSED : SubmissionStatus.FAILED;

      await this.prisma.codingSubmission.update({
        where: { id: submissionId },
        data: { status, score, runtimeMs },
      });

      if (status === SubmissionStatus.PASSED) {
        await this.achievementsService.awardBadge(submission.userId, 'CODING_FIRST_SOLVE');
        await this.notificationsService.createForUser(
          submission.userId,
          'Coding question solved ✅',
          `Your solution to "${submission.codingQuestion.title}" passed all ${testCases.length} test case(s).`,
        );
      } else {
        await this.notificationsService.createForUser(
          submission.userId,
          'Coding submission scored',
          `${passedCount}/${testCases.length} test cases passed on "${submission.codingQuestion.title}".`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Execution failed for submission ${submissionId}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.markError(submissionId, submission.userId);
    }
  }

  private async markError(submissionId: string, userId: string): Promise<void> {
    await this.prisma.codingSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.ERROR },
    });
    await this.notificationsService.createForUser(
      userId,
      'Coding submission failed to run',
      'Something went wrong running your code. Please try submitting again.',
    );
  }
}
