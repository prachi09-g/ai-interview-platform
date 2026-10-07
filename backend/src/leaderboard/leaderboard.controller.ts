import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaderboardPeriod } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardQueryDto } from './dto/get-leaderboard-query.dto';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Leaderboard module' })
  getStatus() {
    return this.leaderboardService.getModuleStatus();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the top 50 leaderboard entries, plus the current user\'s own rank' })
  get(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: GetLeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(
      currentUser.id,
      query.categoryId,
      query.period ?? LeaderboardPeriod.ALL_TIME,
    );
  }
}
