import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search: string | undefined, page: number, limit: number) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { profile: { fullName: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true, profile: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map(({ passwordHash: _passwordHash, ...safe }) => safe),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, profile: { include: { skills: true } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: AdminUpdateUserDto, actingAdminId: string) {
    if (id === actingAdminId && dto.isActive === false) {
      throw new ForbiddenException('You cannot deactivate your own admin account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true, profile: true },
    });
    const { passwordHash: _passwordHash, ...safe } = updated;
    return safe;
  }

  async remove(id: string, actingAdminId: string) {
    if (id === actingAdminId) {
      throw new ForbiddenException('You cannot deactivate your own admin account');
    }
    // Soft-delete for the same referential-integrity reasons as
    // UsersService.deactivate (Phase 6) — preserves history/analytics.
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: 'User deactivated' };
  }
}
