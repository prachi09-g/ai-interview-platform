import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { WhisperClientService } from './ai/whisper-client.service';
import { SpeechMetricsService } from './ai/speech-metrics.service';
import { SpeechAnalysisProcessor } from './processors/speech-analysis.processor';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — matches Whisper's own upload limit

@Module({
  imports: [
    // memoryStorage (see the identical note in resume.module.ts): files
    // land in file.buffer, which StorageService then persists.
    MulterModule.register({ storage: undefined, limits: { fileSize: MAX_AUDIO_SIZE_BYTES } }),
    // Both queues re-registered here per the same @Processor()/WorkerHost
    // requirement explained in interview.module.ts: SPEECH_ANALYSIS because
    // this module's processor consumes it, INTERVIEW_EVALUATION because
    // that same processor also *produces* jobs onto it (see
    // SpeechAnalysisProcessor's handoff to Phase 9's evaluator).
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SPEECH_ANALYSIS },
      { name: QUEUE_NAMES.INTERVIEW_EVALUATION },
    ),
  ],
  controllers: [SpeechController],
  providers: [SpeechService, WhisperClientService, SpeechMetricsService, SpeechAnalysisProcessor],
  exports: [SpeechService],
})
export class SpeechModule {}
