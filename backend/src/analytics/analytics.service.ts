import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InterviewStatus, LeaderboardPeriod, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WINDOW_DAYS: Record<'WEEKLY' | 'MONTHLY', number> = { WEEKLY: 7, MONTHLY: 30 };

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return {
      module: 'analytics',
      status: 'initialized',
      implementedIn: 'Phase 12 (Analytics Dashboard)',
    };
  }

  /**
   * The student-facing "Progress Dashboard" (FR-5.1). Progress rows
   * themselves are written by Phase 9 on every interview completion —
   * this just aggregates them plus resume/coding stats into one view.
   */
  async getStudentProgress(userId: string) {
    const [progress, resumes, codingSubmissions, achievementsEarned] = await Promise.all([
      this.prisma.progress.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { averageScore: 'desc' },
      }),
      this.prisma.resume.findMany({
        where: { userId },
        include: { analysis: { include: { atsReport: true } } },
        orderBy: { uploadedAt: 'desc' },
      }),
      this.prisma.codingSubmission.findMany({ where: { userId } }),
      this.prisma.achievement.count({ where: { userId } }),
    ]);

    const atsScores = resumes
      .map((r) => r.analysis?.atsReport?.atsScore)
      .filter((s): s is number => typeof s === 'number');

    const codingPassed = codingSubmissions.filter((s) => s.status === SubmissionStatus.PASSED).length;

    return {
      byCategory: progress.map((p) => ({
        categoryId: p.categoryId,
        categoryName: p.category.name,
        totalInterviews: p.totalInterviews,
        averageScore: Math.round(p.averageScore),
        trend: p.trend as number[],
      })),
      overallAverageScore: progress.length
        ? Math.round(progress.reduce((sum, p) => sum + p.averageScore, 0) / progress.length)
        : null,
      totalInterviews: progress.reduce((sum, p) => sum + p.totalInterviews, 0),
      resume: {
        latestAtsScore: atsScores[0] ?? null,
        averageAtsScore: atsScores.length ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length) : null,
        totalUploaded: resumes.length,
      },
      coding: {
        totalSubmissions: codingSubmissions.length,
        passed: codingPassed,
        passRate: codingSubmissions.length ? Math.round((codingPassed / codingSubmissions.length) * 100) : null,
      },
      achievementsEarned,
    };
  }

  /** Platform-wide KPIs for the admin analytics dashboard (distinct from the lighter /admin/overview counts from Phase 7). */
  async getAdminOverview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      signupsToday,
      interviewsToday,
      totalInterviews,
      completedInterviews,
      avgScoreResult,
      recentUsers,
      interviewsByCategory,
      codingTotals,
      codingPassed,
      resumeCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.mockInterview.count({ where: { startedAt: { gte: startOfToday } } }),
      this.prisma.mockInterview.count(),
      this.prisma.mockInterview.count({ where: { status: InterviewStatus.COMPLETED } }),
      this.prisma.mockInterview.aggregate({
        where: { overallScore: { not: null } },
        _avg: { overallScore: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.mockInterview.groupBy({ by: ['categoryId'], _count: { _all: true } }),
      this.prisma.codingSubmission.count(),
      this.prisma.codingSubmission.count({ where: { status: SubmissionStatus.PASSED } }),
      this.prisma.resume.count(),
    ]);

    const categories = await this.prisma.interviewCategory.findMany();
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    return {
      kpis: {
        totalUsers,
        signupsToday,
        interviewsToday,
        totalInterviews,
        completedInterviews,
        avgPlatformScore: avgScoreResult._avg.overallScore ? Math.round(avgScoreResult._avg.overallScore) : null,
        totalResumesUploaded: resumeCount,
        codingPassRate: codingTotals ? Math.round((codingPassed / Math.max(codingTotals, 1)) * 100) : null,
      },
      signupsOverTime: this.bucketByDay(recentUsers.map((u) => u.createdAt), 14),
      domainPopularity: interviewsByCategory
        .map((row) => ({
          categoryId: row.categoryId,
          categoryName: categoryNameById.get(row.categoryId) ?? 'Unknown',
          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /** Deep-dive analytics for a single interview domain (admin only). */
  async getDomainAnalytics(categoryId: string) {
    const category = await this.prisma.interviewCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Interview category not found');
    }

    const [interviews, responses, codingQuestions, topPerformers] = await Promise.all([
      this.prisma.mockInterview.findMany({ where: { categoryId, status: InterviewStatus.COMPLETED } }),
      this.prisma.interviewResponse.findMany({
        where: { interview: { categoryId } },
        select: { evaluationBreakdown: true },
      }),
      this.prisma.codingQuestion.findMany({
        where: { categoryId },
        include: { submissions: { select: { status: true } } },
      }),
      this.prisma.leaderboard.findMany({
        where: { categoryId, period: LeaderboardPeriod.ALL_TIME },
        include: { user: { include: { profile: true } } },
        orderBy: { rank: 'asc' },
        take: 5,
      }),
    ]);

    const scores = interviews.map((i) => i.overallScore).filter((s): s is number => s !== null);
    const missedKeywordCounts = new Map<string, number>();
    for (const response of responses) {
      const breakdown = response.evaluationBreakdown as { keywordMatch?: { missedKeywords?: string[] } } | null;
      for (const keyword of breakdown?.keywordMatch?.missedKeywords ?? []) {
        missedKeywordCounts.set(keyword, (missedKeywordCounts.get(keyword) ?? 0) + 1);
      }
    }

    return {
      category,
      totalCompletedInterviews: interviews.length,
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      mostMissedKeywords: [...missedKeywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count })),
      codingQuestions: codingQuestions.map((q) => ({
        id: q.id,
        title: q.title,
        totalSubmissions: q.submissions.length,
        passRate: q.submissions.length
          ? Math.round((q.submissions.filter((s) => s.status === SubmissionStatus.PASSED).length / q.submissions.length) * 100)
          : null,
      })),
      topPerformers: topPerformers.map((entry) => ({
        rank: entry.rank,
        score: entry.score,
        fullName: entry.user.profile?.fullName ?? entry.user.email,
      })),
    };
  }

  /**
   * WEEKLY/MONTHLY leaderboard recomputation — the piece Phase 6/9
   * explicitly left for this phase. Unlike ALL_TIME (which Phase 9 keeps
   * live via Progress on every completion), these need a date-windowed
   * query over MockInterview timestamps, since "the last 7 days" silently
   * changes on its own as time passes rather than on any single event.
   */
  async recomputeWindowedLeaderboards(): Promise<void> {
    const categories = await this.prisma.interviewCategory.findMany({ select: { id: true } });

    for (const category of categories) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all([
        this.recomputeWindowedLeaderboardForCategory(category.id, 'WEEKLY'),
        this.recomputeWindowedLeaderboardForCategory(category.id, 'MONTHLY'),
      ]);
    }

    this.logger.log(`Recomputed WEEKLY/MONTHLY leaderboards for ${categories.length} categories`);
  }

  private async recomputeWindowedLeaderboardForCategory(
    categoryId: string,
    period: 'WEEKLY' | 'MONTHLY',
  ): Promise<void> {
    const windowStart = new Date(Date.now() - WINDOW_DAYS[period] * 24 * 60 * 60 * 1000);

    const grouped = await this.prisma.mockInterview.groupBy({
      by: ['userId'],
      where: { categoryId, status: InterviewStatus.COMPLETED, completedAt: { gte: windowStart } },
      _avg: { overallScore: true },
      orderBy: { _avg: { overallScore: 'desc' } },
      take: 100,
    });

    await Promise.all(
      grouped.map((entry, index) =>
        this.prisma.leaderboard.upsert({
          where: { userId_categoryId_period: { userId: entry.userId, categoryId, period: LeaderboardPeriod[period] } },
          create: {
            userId: entry.userId,
            categoryId,
            period: LeaderboardPeriod[period],
            rank: index + 1,
            score: Math.round(entry._avg.overallScore ?? 0),
          },
          update: { rank: index + 1, score: Math.round(entry._avg.overallScore ?? 0) },
        }),
      ),
    );
  }

  private bucketByDay(dates: Date[], days: number): { date: string; count: number }[] {
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
  }
}
