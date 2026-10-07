import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InterviewStatus, Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QuestionGeneratorService } from './ai/question-generator.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import type { EvaluateResponseJobData } from './processors/interview-evaluation.processor';

const DEFAULT_QUESTION_COUNT_FALLBACK = 10;

/**
 * InterviewService: Phase 6 built the read-only surface (categories,
 * history, bookmarks). Phase 9 adds the actual mock-interview experience
 * — session creation, question assignment, answer submission (queued for
 * async AI evaluation per the Phase 1 sequence diagram), and completion
 * with score/achievement/leaderboard side-effects.
 */
@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionGeneratorService: QuestionGeneratorService,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
    @InjectQueue(QUEUE_NAMES.INTERVIEW_EVALUATION) private readonly evaluationQueue: Queue<EvaluateResponseJobData>,
  ) {}

  getModuleStatus() {
    return {
      module: 'interview',
      status: 'initialized',
      implementedIn: 'Phase 6 (categories + history + bookmarks) + Phase 9 (sessions, questions, scoring)',
    };
  }

  listCategories() {
    return this.prisma.interviewCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findAllForUser(
    userId: string,
    status: InterviewStatus | undefined,
    categoryId: string | undefined,
    page: number,
    limit: number,
  ) {
    const where = { userId, ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.mockInterview.findMany({
        where,
        include: { category: true },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mockInterview.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOneForUser(userId: string, id: string) {
    const interview = await this.getOwnedInterviewOrThrow(userId, id, {
      category: true,
      responses: { include: { question: true, speechAnalysis: true }, orderBy: { answeredAt: 'asc' } },
    });
    return interview;
  }

  async toggleBookmark(userId: string, id: string) {
    const interview = await this.getOwnedInterviewOrThrow(userId, id);

    return this.prisma.mockInterview.update({
      where: { id },
      data: { isBookmarked: !interview.isBookmarked },
    });
  }

  // ==========================================================================
  // Phase 9: session creation, questions, answer submission, completion
  // ==========================================================================

  private async getDefaultQuestionCount(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'DEFAULT_INTERVIEW_QUESTION_COUNT' } });
    const parsed = setting ? parseInt(setting.value, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUESTION_COUNT_FALLBACK;
  }

  async createInterview(userId: string, dto: CreateInterviewDto) {
    const category = await this.prisma.interviewCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Interview category not found');
    }

    const questionCount = dto.questionCount ?? (await this.getDefaultQuestionCount());

    // CreateInterviewDto restricts dto.type (an InterviewType) to TECHNICAL/HR/BEHAVIORAL
    // via @IsIn — the same three string values QuestionType defines. Prisma generates
    // these as distinct enum types even though they share values, hence the cast.
    const questionType = dto.type as unknown as QuestionType;
    const questions = await this.questionGeneratorService.getQuestionsForInterview(
      userId,
      dto.categoryId,
      questionType,
      dto.difficulty,
      questionCount,
    );

    if (questions.length === 0) {
      throw new BadRequestException(
        'No questions are available for this domain/difficulty yet, and AI question generation is not configured. ' +
          'Ask an admin to add questions via /admin/questions, or configure OPENAI_API_KEY.',
      );
    }

    const interview = await this.prisma.mockInterview.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        type: dto.type,
        difficulty: dto.difficulty,
        status: InterviewStatus.IN_PROGRESS,
      },
    });

    // Pre-allocate one InterviewResponse per assigned question (transcript/score
    // null until answered) — see the design note in getQuestionsForSession()
    // for why this shape was chosen over a separate join table.
    await this.prisma.interviewResponse.createMany({
      data: questions.map((q) => ({ interviewId: interview.id, questionId: q.id })),
    });

    return this.prisma.mockInterview.findUniqueOrThrow({
      where: { id: interview.id },
      include: { category: true },
    });
  }

  /**
   * Returns the questions assigned to this session in a stable order.
   * These rows are the same InterviewResponse records created in
   * createInterview() — modeling "assigned but not yet answered" as a
   * response with null transcript/score avoids adding a separate
   * interview<->question join table for what is otherwise the same
   * relationship an answered response already represents.
   */
  async getQuestionsForSession(userId: string, interviewId: string) {
    await this.getOwnedInterviewOrThrow(userId, interviewId);

    const responses = await this.prisma.interviewResponse.findMany({
      where: { interviewId },
      include: { question: true },
      orderBy: { answeredAt: 'asc' },
    });

    return responses.map((r) => ({
      responseId: r.id,
      questionId: r.questionId,
      questionText: r.question.questionText,
      type: r.question.type,
      difficulty: r.question.difficulty,
      isAnswered: r.score !== null,
    }));
  }

  async submitResponse(userId: string, interviewId: string, dto: SubmitResponseDto) {
    const interview = await this.getOwnedInterviewOrThrow(userId, interviewId);

    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException('This interview is not in progress');
    }

    const response = await this.prisma.interviewResponse.findFirst({
      where: { interviewId, questionId: dto.questionId },
    });
    if (!response) {
      throw new NotFoundException('This question is not part of this interview session');
    }

    const updated = await this.prisma.interviewResponse.update({
      where: { id: response.id },
      data: {
        transcript: dto.transcript,
        answeredAt: new Date(),
        // Reset any prior evaluation if the student is re-submitting —
        // the queue below will recompute it. Prisma.DbNull (not JsonNull)
        // because this represents true absence of an evaluation, not a
        // JSON `null` value stored as data — see the Prisma docs on
        // "Working with Json fields" for why these aren't interchangeable.
        score: null,
        evaluationBreakdown: Prisma.DbNull,
      },
    });

    await this.evaluationQueue.add(
      'evaluate-response',
      { responseId: updated.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return updated;
  }

  async getResponse(userId: string, interviewId: string, responseId: string) {
    await this.getOwnedInterviewOrThrow(userId, interviewId);

    const response = await this.prisma.interviewResponse.findUnique({
      where: { id: responseId },
      include: { question: true },
    });

    if (!response || response.interviewId !== interviewId) {
      throw new NotFoundException('Response not found');
    }

    return {
      ...response,
      evaluationStatus: response.transcript === null ? 'unanswered' : response.score === null ? 'evaluating' : 'evaluated',
    };
  }

  async completeInterview(userId: string, interviewId: string) {
    const interview = (await this.getOwnedInterviewOrThrow(userId, interviewId, { responses: true })) as Prisma.MockInterviewGetPayload<{ include: { responses: true } }>;

    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException('This interview has already been completed');
    }

    const unanswered = interview.responses.filter((r) => r.transcript === null);
    if (unanswered.length > 0) {
      throw new BadRequestException(`${unanswered.length} question(s) still unanswered`);
    }

    const stillEvaluating = interview.responses.filter((r) => r.score === null);
    if (stillEvaluating.length > 0) {
      throw new BadRequestException(
        `${stillEvaluating.length} response(s) are still being evaluated — poll GET /interviews/:id/responses/:responseId and retry shortly`,
      );
    }

    const overallScore = Math.round(
      interview.responses.reduce((sum, r) => sum + (r.score ?? 0), 0) / interview.responses.length,
    );

    const completed = await this.prisma.mockInterview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.COMPLETED, completedAt: new Date(), overallScore },
      include: { category: true },
    });

    await Promise.all([
      this.updateProgress(userId, interview.categoryId, overallScore),
      this.handleCompletionAchievements(userId, overallScore),
      this.notificationsService.createForUser(
        userId,
        'Mock interview scored',
        `Your ${completed.category.name} interview is scored: ${overallScore}/100.`,
      ),
    ]);

    await this.recomputeAllTimeLeaderboard(interview.categoryId);

    return completed;
  }

  private async updateProgress(userId: string, categoryId: string, latestScore: number): Promise<void> {
    const existing = await this.prisma.progress.findUnique({ where: { userId_categoryId: { userId, categoryId } } });

    const trend = Array.isArray(existing?.trend) ? (existing!.trend as number[]) : [];
    const newTrend = [...trend, latestScore].slice(-20); // keep the most recent 20 points
    const totalInterviews = (existing?.totalInterviews ?? 0) + 1;
    const averageScore = (existing?.averageScore ?? 0) * (totalInterviews - 1) / totalInterviews + latestScore / totalInterviews;

    await this.prisma.progress.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId, totalInterviews: 1, averageScore: latestScore, trend: newTrend },
      update: { totalInterviews, averageScore, trend: newTrend },
    });
  }

  private async handleCompletionAchievements(userId: string, overallScore: number): Promise<void> {
    const completedCount = await this.prisma.mockInterview.count({
      where: { userId, status: InterviewStatus.COMPLETED },
    });

    if (completedCount === 1) {
      await this.achievementsService.awardBadge(userId, 'FIRST_INTERVIEW');
    }
    if (completedCount === 5) {
      await this.achievementsService.awardBadge(userId, 'FIVE_INTERVIEWS');
    }
    if (overallScore === 100) {
      await this.achievementsService.awardBadge(userId, 'PERFECT_INTERVIEW');
    }
  }

  /**
   * Re-ranks the ALL_TIME leaderboard for a category from Progress data.
   * WEEKLY/MONTHLY periods need date-windowed queries over interview
   * timestamps rather than the all-time running average Progress stores —
   * that's Phase 12 (Analytics)'s job, matching the note left in Phase 6's
   * LeaderboardService about where recomputation comes from.
   */
  private async recomputeAllTimeLeaderboard(categoryId: string): Promise<void> {
    const ranked = await this.prisma.progress.findMany({
      where: { categoryId },
      orderBy: { averageScore: 'desc' },
      take: 100,
    });

    await Promise.all(
      ranked.map((entry, index) =>
        this.prisma.leaderboard.upsert({
          where: {
            userId_categoryId_period: { userId: entry.userId, categoryId, period: 'ALL_TIME' },
          },
          create: {
            userId: entry.userId,
            categoryId,
            period: 'ALL_TIME',
            rank: index + 1,
            score: Math.round(entry.averageScore),
          },
          update: { rank: index + 1, score: Math.round(entry.averageScore) },
        }),
      ),
    );
  }

  private async getOwnedInterviewOrThrow(userId: string, id: string, include?: Prisma.MockInterviewInclude) {
    const interview = await this.prisma.mockInterview.findUnique({ where: { id }, include });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }
    if (interview.userId !== userId) {
      throw new ForbiddenException('This interview does not belong to you');
    }

    return interview;
  }
}
