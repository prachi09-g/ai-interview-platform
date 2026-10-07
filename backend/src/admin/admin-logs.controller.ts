import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { SystemLogsService } from '../logging/system-logs.service';

class LogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 100;
}

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] Recent HTTP request log (in-memory, current instance only — see system-logs.service.ts)',
  })
  findRecent(@Query() query: LogsQueryDto) {
    return this.systemLogsService.findRecent(query.limit ?? 100);
  }
}
