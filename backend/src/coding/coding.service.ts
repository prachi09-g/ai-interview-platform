import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { Judge0ClientService } from './ai/judge0-client.service';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { ListCodingQuestionsQueryDto } from './dto/list-coding-questions-query.dto';
import type { RunSubmissionJobData } from './processors/coding-execution.processor';

@Injectable()
export class CodingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly judge0ClientService: Judge0ClientService,
    @InjectQueue(QUEUE_NAMES.CODING_EXECUTION) private readonly codingQueue: Queue<RunSubmissionJobData>,
  ) {}

  getModuleStatus() {
    return {
      module: 'coding',
      status: 'initialized',
      implementedIn: 'Phase 11 (Coding Assessment)',
      judge0Configured: this.judge0ClientService.isConfigured(),
    };
  }

  async listQuestions(query: ListCodingQuestionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.codingQuestion.findMany({
        where,
        // testCases deliberately excluded from the list view — no reason
        // to ship every hidden test case's expected output to the browser
        // before the student has even opened the question.
        select: {
          id: true,
          title: true,
          difficulty: true,
          supportedLanguages: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.codingQuestion.count({ where }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getQuestion(id: string) {
    const question = await this.prisma.codingQuestion.findUnique({ where: { id }, include: { category: true } });
    if (!question) {
      throw new NotFoundException('Coding question not found');
    }

    const testCases = question.testCases as { input: string; expectedOutput: string }[];

    return {
      ...question,
      // Only the first test case is shown as a worked example; the rest
      // stay hidden and are used purely for judging (see submit()).
      visibleTestCase: testCases[0] ?? null,
      hiddenTestCaseCount: Math.max(0, testCases.length - 1),
      testCases: undefined,
    };
  }

  async submit(userId: string, questionId: string, dto: SubmitCodeDto) {
    const question = await this.prisma.codingQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException('Coding question not found');
    }

    const supportedLanguages = question.supportedLanguages as string[];
    if (!supportedLanguages.map((l) => l.toLowerCase()).includes(dto.language.toLowerCase())) {
      throw new BadRequestException(
        `This question doesn't support "${dto.language}". Supported: ${supportedLanguages.join(', ')}`,
      );
    }

    if (!this.judge0ClientService.resolveLanguageId(dto.language)) {
      throw new BadRequestException(`"${dto.language}" isn't mapped to a Judge0 language ID yet.`);
    }

    const submission = await this.prisma.codingSubmission.create({
      data: { userId, codingQuestionId: questionId, language: dto.language, code: dto.code },
    });

    await this.codingQueue.add(
      'run-submission',
      { submissionId: submission.id },
      { attempts: 2, backoff: { type: 'exponential', delay: 3000 } },
    );

    return submission;
  }

  async listSubmissions(userId: string, questionId: string | undefined, page: number, limit: number) {
    const where = { userId, ...(questionId ? { codingQuestionId: questionId } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.codingSubmission.findMany({
        where,
        include: { codingQuestion: { select: { id: true, title: true, difficulty: true } } },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.codingSubmission.count({ where }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getSubmission(userId: string, id: string) {
    const submission = await this.prisma.codingSubmission.findUnique({
      where: { id },
      include: { codingQuestion: { select: { id: true, title: true, difficulty: true } } },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.userId !== userId) {
      throw new ForbiddenException('This submission does not belong to you');
    }

    return submission;
  }
}
