import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';
import { PrismaHealthIndicator } from './prisma/prisma-health.indicator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API welcome banner' })
  getWelcome() {
    return this.appService.getWelcome();
  }

  @Public()
  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness/readiness probe — verifies the API and database are up' })
  checkHealth() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
