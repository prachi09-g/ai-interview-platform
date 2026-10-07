import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BADGE_CATALOG, findBadge } from './badge-catalog';

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return {
      module: 'achievements',
      status: 'initialized',
      implementedIn: 'Phase 6 (Student Dashboard) — most badges are awarded by the phase that owns their milestone',
    };
  }

  /**
   * Awards a badge to a user, if not already earned. Safe to call
   * unconditionally on every relevant event (e.g. every interview
   * completion calling this for FIRST_INTERVIEW) — the
   * @@unique([userId, badgeCode]) constraint in the schema makes this
   * idempotent without needing a SELECT-then-INSERT race condition.
   */
  async awardBadge(userId: string, badgeCode: string): Promise<{ awarded: boolean }> {
    if (!findBadge(badgeCode)) {
      throw new Error(`Unknown badge code: ${badgeCode}`); // programmer error, not user-facing
    }

    try {
      await this.prisma.achievement.create({ data: { userId, badgeCode } });
      return { awarded: true };
    } catch {
      // Unique constraint violation — already earned. Not an error condition.
      return { awarded: false };
    }
  }

  /**
   * Returns the full catalog annotated with each badge's earned status/date
   * for this user — the shape the "earned vs locked" dashboard grid needs.
   */
  async findAllForUser(userId: string) {
    const earned = await this.prisma.achievement.findMany({ where: { userId } });
    const earnedByCode = new Map(earned.map((a) => [a.badgeCode, a.earnedAt]));

    return BADGE_CATALOG.map((badge) => ({
      ...badge,
      earned: earnedByCode.has(badge.code),
      earnedAt: earnedByCode.get(badge.code) ?? null,
    }));
  }
}
