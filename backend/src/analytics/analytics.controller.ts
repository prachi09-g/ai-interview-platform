import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Analytics module' })
  getStatus() {
    return this.analyticsService.getModuleStatus();
  }

  @Get('progress')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Get the authenticated student's cross-category progress" })
  getProgress(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.analyticsService.getStudentProgress(currentUser.id);
  }

  @Roles(RoleName.ADMIN)
  @Get('overview')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Platform-wide KPIs and trend charts (admin only)' })
  getOverview() {
    return this.analyticsService.getAdminOverview();
  }

  @Roles(RoleName.ADMIN)
  @Get('domain/:categoryId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Deep-dive analytics for a single interview domain (admin only)' })
  getDomainAnalytics(@Param('categoryId') categoryId: string) {
    return this.analyticsService.getDomainAnalytics(categoryId);
  }
}
