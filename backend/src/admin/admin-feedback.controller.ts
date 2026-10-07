import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminFeedbackService } from './admin-feedback.service';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private readonly service: AdminFeedbackService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List feedback submissions' })
  findAll(@Query() query: AdminListQueryDto) {
    return this.service.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update feedback status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFeedbackStatusDto) {
    return this.service.updateStatus(id, dto);
  }
}
