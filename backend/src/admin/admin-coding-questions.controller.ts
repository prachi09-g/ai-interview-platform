import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminCodingQuestionsService } from './admin-coding-questions.service';
import { CreateCodingQuestionDto, UpdateCodingQuestionDto } from './dto/coding-question.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/coding-questions')
export class AdminCodingQuestionsController {
  constructor(private readonly service: AdminCodingQuestionsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List coding questions' })
  findAll(@Query() query: AdminListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get a coding question' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Create a coding question' })
  create(@Body() dto: CreateCodingQuestionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update a coding question' })
  update(@Param('id') id: string, @Body() dto: UpdateCodingQuestionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Delete a coding question' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
