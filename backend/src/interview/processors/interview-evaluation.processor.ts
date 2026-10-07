import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import { AnswerEvaluatorService } from '../ai/answer-evaluator.service';

export interface EvaluateResponseJobData {
  responseId: string;
}

/**
 * Consumes the INTERVIEW_EVALUATION queue registered in Phase 2's
 * QueueModule, implementing the exact flow from the Phase 1 architecture
 * doc's sequence diagram (§2.3): the controller enqueues and returns
 * immediately with the response in a pending state; this processor runs
 * the actual AI evaluation and writes the result; the frontend polls
 * GET /interviews/:id/responses/:responseId until score is non-null.
 *
 * Unlike Resume's synchronous analyze() (a deliberate, documented
 * trade-off for a single lightweight call), interview evaluation runs
 * per-answer across a whole session and is exactly the kind of
 * AI-latency work Phase 2 built this queue for.
 */
@Processor(QUEUE_NAMES.INTERVIEW_EVALUATION)
export class InterviewEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(InterviewEvaluationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly answerEvaluatorService: AnswerEvaluatorService,
  ) {
    super();
  }

  async process(job: Job<EvaluateResponseJobData>): Promise<void> {
    const { responseId } = job.data;

    const response = await this.prisma.interviewResponse.findUnique({
      where: { id: responseId },
      include: { question: true },
    });

    if (!response || !response.transcript) {
      this.logger.warn(`Response ${responseId} not found or has no transcript — skipping evaluation`);
      return;
    }

    try {
      const { score, breakdown } = await this.answerEvaluatorService.evaluate(
        response.question.questionText,
        response.question.modelAnswer,
        response.question.keywords as string[],
        response.transcript,
      );

      await this.prisma.interviewResponse.update({
        where: { id: responseId },
        data: {
          score,
          evaluationBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Evaluation failed for response ${responseId}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Leave score as null — GET .../responses/:id continuing to report
      // "pending" is more honest than silently persisting a fabricated
      // score, and the student can retry by re-submitting the answer.
      throw error; // lets BullMQ's retry/backoff policy handle it
    }
  }
}
