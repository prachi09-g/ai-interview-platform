import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InterviewService } from './interview.service';
import { ListInterviewsQueryDto } from './dto/list-interviews-query.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@ApiTags('Interview')
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Interview module' })
  getStatus() {
    return this.interviewService.getModuleStatus();
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List all interview domains (Software Dev, Data Science, AI/ML, Cloud, Cybersecurity, HR)' })
  listCategories() {
    return this.interviewService.listCategories();
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start a new mock interview session (assigns questions from the bank, topping up with AI-generated ones)' })
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateInterviewDto) {
    return this.interviewService.createInterview(currentUser.id, dto);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's interview history" })
  list(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: ListInterviewsQueryDto) {
    return this.interviewService.findAllForUser(
      currentUser.id,
      query.status,
      query.categoryId,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single interview with its responses' })
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewService.findOneForUser(currentUser.id, id);
  }

  @Get(':id/questions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the ordered list of questions assigned to this session' })
  getQuestions(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewService.getQuestionsForSession(currentUser.id, id);
  }

  @Post(':id/responses')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Submit an answer to a question in this session — queues async AI evaluation, poll the GET endpoint below for the result',
  })
  submitResponse(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.interviewService.submitResponse(currentUser.id, id, dto);
  }

  @Get(':id/responses/:responseId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Poll the evaluation status/result of a submitted response' })
  getResponse(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Param('responseId') responseId: string,
  ) {
    return this.interviewService.getResponse(currentUser.id, id, responseId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Finalize the session: computes the overall score, updates progress/leaderboard, awards achievements' })
  complete(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewService.completeInterview(currentUser.id, id);
  }

  @Patch(':id/bookmark')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle the bookmark flag on an interview' })
  toggleBookmark(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewService.toggleBookmark(currentUser.id, id);
  }
}
