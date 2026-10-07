import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from './prisma.service';

/**
 * @nestjs/terminus does not ship a built-in Prisma indicator (only
 * TypeORM/Mongoose/etc). This runs a trivial `SELECT 1` through Prisma
 * to verify the PostgreSQL connection is alive.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      throw new HealthCheckError(`${key} check failed`, this.getStatus(key, false, { message }));
    }
  }
}
