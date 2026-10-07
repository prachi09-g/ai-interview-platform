import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SpeechService } from './speech.service';
import { TranscribeAudioDto } from './dto/transcribe-audio.dto';

@ApiTags('Speech Analysis')
@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Module wiring status for the Speech Analysis module' })
  getStatus() {
    return this.speechService.getModuleStatus();
  }

  @Post('transcribe')
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a voice answer for transcription + speech analysis (queued — poll GET /speech/analysis/:responseId)',
  })
  @UseInterceptors(FileInterceptor('audio'))
  transcribe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: TranscribeAudioDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.speechService.transcribeAndAnalyze(currentUser.id, dto, file);
  }

  @Get('analysis/:responseId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Poll the speech-analysis status/result for a voice answer' })
  getAnalysis(@CurrentUser() currentUser: AuthenticatedUser, @Param('responseId') responseId: string) {
    return this.speechService.getAnalysis(currentUser.id, responseId);
  }
}
