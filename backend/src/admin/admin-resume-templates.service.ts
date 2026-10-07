import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateResumeTemplateDto, UpdateResumeTemplateDto } from './dto/resume-template.dto';

@Injectable()
export class AdminResumeTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  findAll() {
    return this.prisma.resumeTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const template = await this.prisma.resumeTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Resume template not found');
    return template;
  }

  async create(dto: CreateResumeTemplateDto, file: Express.Multer.File) {
    const { fileUrl } = await this.storageService.uploadFile(file.buffer, file.originalname, 'resume-templates');
    return this.prisma.resumeTemplate.create({ data: { ...dto, fileUrl } });
  }

  async update(id: string, dto: UpdateResumeTemplateDto) {
    await this.findOne(id);
    return this.prisma.resumeTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const template = await this.findOne(id);
    await this.storageService.deleteFile(template.fileUrl);
    await this.prisma.resumeTemplate.delete({ where: { id } });
    return { message: 'Resume template deleted' };
  }
}
