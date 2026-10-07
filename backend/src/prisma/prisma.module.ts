import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Global module — PrismaService (and its health indicator) are available
 * for injection in every feature module without needing to re-import
 * PrismaModule everywhere.
 */
@Global()
@Module({
  providers: [PrismaService, PrismaHealthIndicator],
  exports: [PrismaService, PrismaHealthIndicator],
})
export class PrismaModule {}
