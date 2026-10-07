import { Test, TestingModule } from '@nestjs/testing';
import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma/prisma.service';
import { BADGE_CATALOG } from './badge-catalog';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let prisma: { achievement: { create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { achievement: { create: jest.fn(), findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AchievementsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AchievementsService);
  });

  describe('awardBadge', () => {
    it('rejects an unknown badge code before touching the database', async () => {
      await expect(service.awardBadge('user-1', 'NOT_A_REAL_BADGE')).rejects.toThrow('Unknown badge code');
      expect(prisma.achievement.create).not.toHaveBeenCalled();
    });

    it('creates the achievement and reports awarded:true on first award', async () => {
      prisma.achievement.create.mockResolvedValue({ id: 'a-1', userId: 'user-1', badgeCode: 'EARLY_ADOPTER' });

      const result = await service.awardBadge('user-1', 'EARLY_ADOPTER');

      expect(result).toEqual({ awarded: true });
      expect(prisma.achievement.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', badgeCode: 'EARLY_ADOPTER' },
      });
    });

    it('is idempotent: a duplicate award (unique constraint violation) reports awarded:false, not an error', async () => {
      // Simulates Prisma's real behavior when @@unique([userId, badgeCode])
      // is violated — this is the whole point of awardBadge() being safe
      // to call unconditionally on every relevant event.
      prisma.achievement.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      );

      const result = await service.awardBadge('user-1', 'EARLY_ADOPTER');

      expect(result).toEqual({ awarded: false });
    });
  });

  describe('findAllForUser', () => {
    it('returns the full catalog annotated with earned status for a user with no achievements', async () => {
      prisma.achievement.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser('user-1');

      expect(result).toHaveLength(BADGE_CATALOG.length);
      expect(result.every((b) => b.earned === false && b.earnedAt === null)).toBe(true);
    });

    it('marks only the earned badges as earned, with their earnedAt date, leaving others locked', async () => {
      const earnedAt = new Date('2026-01-15T00:00:00Z');
      prisma.achievement.findMany.mockResolvedValue([{ badgeCode: 'EARLY_ADOPTER', earnedAt }]);

      const result = await service.findAllForUser('user-1');

      const earlyAdopter = result.find((b) => b.code === 'EARLY_ADOPTER');
      expect(earlyAdopter?.earned).toBe(true);
      expect(earlyAdopter?.earnedAt).toBe(earnedAt);

      const others = result.filter((b) => b.code !== 'EARLY_ADOPTER');
      expect(others.every((b) => b.earned === false)).toBe(true);
    });
  });
});
