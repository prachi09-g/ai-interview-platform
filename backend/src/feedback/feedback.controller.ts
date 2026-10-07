import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Feedback module' })
  getStatus() {
    return this.feedbackService.getModuleStatus();
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit feedback or a bug report' })
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(currentUser.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's own feedback submissions" })
  findMine(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.feedbackService.findAllForUser(currentUser.id);
  }
}
