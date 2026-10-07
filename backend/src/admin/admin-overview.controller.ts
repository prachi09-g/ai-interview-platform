import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminOverviewService } from './admin-overview.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly service: AdminOverviewService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Platform-wide KPI overview' })
  getOverview() {
    return this.service.getOverview();
  }
}
