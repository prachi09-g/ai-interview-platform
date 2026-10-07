import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LeaderboardRefreshJob } from './jobs/leaderboard-refresh.job';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LeaderboardRefreshJob],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
