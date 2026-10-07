import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ResumeService } from './resume.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';

@ApiTags('Resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Resume module' })
  getStatus() {
    return this.resumeService.getModuleStatus();
  }

  @Post('upload')
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a resume PDF (max 5MB)' })
  upload(@CurrentUser() currentUser: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    return this.resumeService.upload(currentUser.id, file);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the authenticated user's uploaded resumes" })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.resumeService.findAllForUser(currentUser.id);
  }

  @Get('templates')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Browse admin-curated resume templates' })
  listTemplates() {
    return this.resumeService.listTemplates();
  }

  @Get(':id/analysis')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the stored analysis for a resume (404 if not yet analyzed)' })
  getAnalysis(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.resumeService.getAnalysis(currentUser.id, id);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/analyze')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Run (or re-run) ATS scoring and AI suggestions for a resume' })
  analyze(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AnalyzeResumeDto,
  ) {
    return this.resumeService.analyze(currentUser.id, id, dto.targetJobRole);
  }

  @Get(':id/ats-report')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get just the ATS score + section breakdown for a resume' })
  getAtsReport(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.resumeService.getAtsReport(currentUser.id, id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a resume and its stored file' })
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.resumeService.remove(currentUser.id, id);
  }
}
