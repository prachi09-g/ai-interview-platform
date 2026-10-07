import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics.service';

const DEFAULT_CRON_EXPRESSION = '0 * * * *';
const JOB_NAME = 'leaderboard-refresh';

@Injectable()
export class LeaderboardRefreshJob implements OnModuleInit {
  private readonly logger = new Logger(LeaderboardRefreshJob.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        key: 'LEADERBOARD_REFRESH_CRON',
      },
    });

    const expression =
      setting?.value ?? DEFAULT_CRON_EXPRESSION;

    try {
      await this.createJob(expression);

      this.logger.log(
        `Leaderboard refresh job scheduled: "${expression}"`,
      );
    } catch {
      this.logger.warn(
        `Invalid LEADERBOARD_REFRESH_CRON value "${expression}" — falling back to hourly (${DEFAULT_CRON_EXPRESSION})`,
      );

      await this.createJob(DEFAULT_CRON_EXPRESSION);

      this.logger.log(
        `Leaderboard refresh job scheduled: "${DEFAULT_CRON_EXPRESSION}"`,
      );
    }
  }

  private async createJob(expression: string): Promise<void> {
    const cronModule = await import(
      '@nestjs/schedule/node_modules/cron'
    );

    const job = new cronModule.CronJob(
      expression,
      () => {
        void this.runRefresh();
      },
    );

    this.schedulerRegistry.addCronJob(
      JOB_NAME,
      job,
    );

    job.start();
  }

  private async runRefresh(): Promise<void> {
    try {
      await this.analyticsService.recomputeWindowedLeaderboards();
    } catch (error) {
      this.logger.error(
        'Scheduled leaderboard refresh failed',
        error instanceof Error
          ? error.stack
          : undefined,
      );
    }
  }
}