import { Injectable } from '@nestjs/common';
import { LeaderboardPeriod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return {
      module: 'leaderboard',
      status: 'initialized',
      implementedIn:
        'Phase 6 (read API) — rows are populated when Phase 9 (AI Interview) completes an interview and recomputed by Phase 12 (Analytics)',
    };
  }

  async getLeaderboard(userId: string, categoryId: string | undefined, period: LeaderboardPeriod) {
    const where = { period, ...(categoryId ? { categoryId } : {}) };

    const [entries, myEntry] = await Promise.all([
      this.prisma.leaderboard.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          category: true,
        },
        orderBy: { rank: 'asc' },
        take: 50,
      }),
      this.prisma.leaderboard.findFirst({
        where: { ...where, userId },
        include: { category: true },
      }),
    ]);

    return {
      entries: entries.map((e) => ({
        rank: e.rank,
        score: e.score,
        category: e.category.name,
        fullName: e.user.profile?.fullName ?? e.user.email,
        isCurrentUser: e.userId === userId,
      })),
      myRank: myEntry ? { rank: myEntry.rank, score: myEntry.score, category: myEntry.category.name } : null,
    };
  }
}
