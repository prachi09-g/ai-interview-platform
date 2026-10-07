import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleStatus() {
    return {
      module: 'notifications',
      status: 'initialized',
      implementedIn: 'Phase 6 (Student Dashboard) — admin broadcast lands in Phase 7',
    };
  }

  /**
   * Internal helper for other modules to raise a notification for a user.
   * Not exposed directly over HTTP — AuthService already calls this on
   * registration (welcome notification); Interview/Coding/Admin modules
   * call it in their own phases (e.g. "Your mock interview was scored").
   */
  createForUser(userId: string, title: string, message: string) {
    return this.prisma.notification.create({ data: { userId, title, message } });
  }

  async findAllForUser(userId: string, unreadOnly: boolean | undefined, page: number, limit: number) {
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), unreadCount },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('This notification does not belong to you');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
