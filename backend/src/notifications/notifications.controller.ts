import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Notifications module' })
  getStatus() {
    return this.notificationsService.getModuleStatus();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's notifications" })
  list(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notificationsService.findAllForUser(
      currentUser.id,
      query.unreadOnly,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Patch(':id/read')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(currentUser.id, id);
  }
}
