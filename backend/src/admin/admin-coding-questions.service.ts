import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCodingQuestionDto,
  UpdateCodingQuestionDto,
} from './dto/coding-question.dto';
import { AdminListQueryDto } from './dto/list-query.dto';

@Injectable()
export class AdminCodingQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = query.search
      ? {
          title: {
            contains: query.search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.codingQuestion.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.codingQuestion.count({
        where,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.codingQuestion.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Coding question not found');
    }

    return question;
  }

  create(dto: CreateCodingQuestionDto) {
    const data: Prisma.CodingQuestionCreateInput = {
      title: dto.title,
      description: dto.description,
      difficulty: dto.difficulty,
      category: {
        connect: {
          id: dto.categoryId,
        },
      },
      testCases: dto.testCases as unknown as Prisma.InputJsonValue,
      supportedLanguages:
        dto.supportedLanguages as unknown as Prisma.InputJsonValue,
    };

    return this.prisma.codingQuestion.create({
      data,
    });
  }

  async update(id: string, dto: UpdateCodingQuestionDto) {
    await this.findOne(id);

    const data: Prisma.CodingQuestionUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.difficulty !== undefined) {
      data.difficulty = dto.difficulty;
    }

    if (dto.categoryId !== undefined) {
      data.category = {
        connect: {
          id: dto.categoryId,
        },
      };
    }

    if (dto.testCases !== undefined) {
      data.testCases =
        dto.testCases as unknown as Prisma.InputJsonValue;
    }

    if (dto.supportedLanguages !== undefined) {
      data.supportedLanguages =
        dto.supportedLanguages as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.codingQuestion.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.codingQuestion.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Coding question deleted',
    };
  }
}
