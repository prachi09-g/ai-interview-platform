import { Injectable } from '@nestjs/common';
import { FeedbackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real counts from the database — no fabricated numbers. totalInterviews
   * will read 0 until Phase 9 (AI Interview) generates real sessions;
   * totalQuestions/totalCodingQuestions grow as admins add content via
   * this same Phase 7 CRUD. Deeper trend charts (signups over time, domain
   * popularity, score distribution) are Phase 12 (Analytics).
   */
  async getOverview() {
    const [
      totalUsers,
      activeUsers,
      totalCategories,
      totalQuestions,
      totalCodingQuestions,
      totalInterviews,
      openFeedbackCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.interviewCategory.count(),
      this.prisma.question.count(),
      this.prisma.codingQuestion.count(),
      this.prisma.mockInterview.count(),
      this.prisma.feedback.count({ where: { status: { in: [FeedbackStatus.OPEN, FeedbackStatus.IN_REVIEW] } } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalCategories,
      totalQuestions,
      totalCodingQuestions,
      totalInterviews,
      openFeedbackCount,
    };
  }
}
