import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminResumeTemplatesService } from './admin-resume-templates.service';
import { CreateResumeTemplateDto, UpdateResumeTemplateDto } from './dto/resume-template.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/resume-templates')
export class AdminResumeTemplatesController {
  constructor(private readonly service: AdminResumeTemplatesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] List resume templates' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: '[Admin] Upload a new resume template' })
  create(@Body() dto: CreateResumeTemplateDto, @UploadedFile() file: Express.Multer.File) {
    return this.service.create(dto, file);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update a resume template\'s name/description' })
  update(@Param('id') id: string, @Body() dto: UpdateResumeTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[Admin] Delete a resume template' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
