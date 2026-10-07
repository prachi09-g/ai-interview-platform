import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { TranscribeAudioDto } from './dto/transcribe-audio.dto';
import type { AnalyzeSpeechJobData } from './processors/speech-analysis.processor';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — matches Whisper's own upload limit

/**
 * SpeechService — module wiring established in Phase 2, business logic
 * added in Phase 10. Voice answers are deliberately NOT a separate
 * MockInterview "type" (see the design note this phase's README section
 * — VOICE is an answer *modality*, available for any TECHNICAL/HR/
 * BEHAVIORAL session, not a distinct content category). This service
 * uploads the recording, kicks off async transcription+analysis (queued
 * — Whisper's network round-trip is exactly the kind of latency Phase 2
 * built this queue for), and exposes polling for the result.
 */
@Injectable()
export class SpeechService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue(QUEUE_NAMES.SPEECH_ANALYSIS) private readonly speechQueue: Queue<AnalyzeSpeechJobData>,
  ) {}

  getModuleStatus() {
    return {
      module: 'speech',
      status: 'initialized',
      implementedIn: 'Phase 10 (Speech Analysis)',
    };
  }

  async transcribeAndAnalyze(userId: string, dto: TranscribeAudioDto, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('An audio file is required');
    }
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('Only audio files are accepted');
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException('Audio file exceeds the 25MB size limit');
    }

    const response = await this.getOwnedResponseOrThrow(userId, dto.responseId);

    if (response.interview.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This interview is not in progress');
    }

    const stored = await this.storageService.uploadFile(file.buffer, file.originalname, 'audio');

    await this.prisma.interviewResponse.update({
      where: { id: dto.responseId },
      data: { audioUrl: stored.fileUrl },
    });

    await this.speechQueue.add(
      'analyze-speech',
      {
        responseId: dto.responseId,
        audioUrl: stored.fileUrl,
        durationSeconds: dto.durationSeconds,
        clientTranscript: dto.transcript,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return { responseId: dto.responseId, audioUrl: stored.fileUrl, status: 'processing' as const };
  }

  async getAnalysis(userId: string, responseId: string) {
    const response = await this.getOwnedResponseOrThrow(userId, responseId);

    const analysis = await this.prisma.speechAnalysis.findUnique({ where: { responseId } });

    if (analysis) {
      return { status: 'ready' as const, analysis };
    }
    if (response.audioUrl) {
      return { status: 'processing' as const, analysis: null };
    }
    return { status: 'not_started' as const, analysis: null };
  }

  private async getOwnedResponseOrThrow(userId: string, responseId: string) {
    const response = await this.prisma.interviewResponse.findUnique({
      where: { id: responseId },
      include: { interview: true },
    });

    if (!response) {
      throw new NotFoundException('Interview response not found');
    }
    if (response.interview.userId !== userId) {
      throw new ForbiddenException('This response does not belong to you');
    }

    return response;
  }
}
