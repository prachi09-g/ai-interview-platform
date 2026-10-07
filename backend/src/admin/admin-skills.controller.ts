import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminSkillsService } from './admin-skills.service';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/skills')
export class AdminSkillsController {
  constructor(private readonly service: AdminSkillsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List the skills taxonomy' })
  findAll(@Query() query: AdminListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get a skill' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Create a skill' })
  create(@Body() dto: CreateSkillDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update a skill' })
  update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Delete a skill' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
