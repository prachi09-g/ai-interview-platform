import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto, UpdateSkillDto } from './dto/skill.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@Injectable()
export class AdminSkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where = query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {};

    const [items, total] = await Promise.all([
      this.prisma.skill.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.skill.count({ where }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }

  async create(dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A skill with this name already exists');
    return this.prisma.skill.create({ data: dto });
  }

  async update(id: string, dto: UpdateSkillDto) {
    await this.findOne(id);
    return this.prisma.skill.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.skill.delete({ where: { id } });
    return { message: 'Skill deleted' };
  }
}
