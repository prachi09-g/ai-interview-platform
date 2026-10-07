import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Achievements module' })
  getStatus() {
    return this.achievementsService.getModuleStatus();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the full badge catalog annotated with the current user's earned status" })
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.achievementsService.findAllForUser(currentUser.id);
  }
}
