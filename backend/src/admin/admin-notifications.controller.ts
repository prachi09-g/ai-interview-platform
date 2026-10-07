import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(RoleName.ADMIN)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('broadcast')
  @ApiOperation({ summary: '[Admin] Send a notification to every active student' })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const students = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: RoleName.STUDENT } },
      select: { id: true },
    });

    await Promise.all(
      students.map((s) => this.notificationsService.createForUser(s.id, dto.title, dto.message)),
    );

    return { message: `Notification sent to ${students.length} student(s)` };
  }
}
