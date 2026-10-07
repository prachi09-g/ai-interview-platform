import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CodingService } from './coding.service';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { ListCodingQuestionsQueryDto } from './dto/list-coding-questions-query.dto';

@ApiTags('Coding Assessment')
@Controller('coding')
export class CodingController {
  constructor(private readonly codingService: CodingService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Coding Assessment module' })
  getStatus() {
    return this.codingService.getModuleStatus();
  }

  @Get('questions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List coding questions (paginated, filterable by category/difficulty/search)' })
  listQuestions(@Query() query: ListCodingQuestionsQueryDto) {
    return this.codingService.listQuestions(query);
  }

  @Get('submissions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's coding submissions" })
  listSubmissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('questionId') questionId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.codingService.listSubmissions(currentUser.id, questionId, Number(page), Number(limit));
  }

  @Get('submissions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Poll a single submission for its status/result' })
  getSubmission(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.codingService.getSubmission(currentUser.id, id);
  }

  @Get('questions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single coding question (one worked example test case; the rest stay hidden)' })
  getQuestion(@Param('id') id: string) {
    return this.codingService.getQuestion(id);
  }

  @Post('questions/:id/submit')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit code for judging (queued — poll GET /coding/submissions/:id)' })
  submit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitCodeDto,
  ) {
    return this.codingService.submit(currentUser.id, id, dto);
  }
}
