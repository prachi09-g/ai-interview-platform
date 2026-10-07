import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import { WhisperClientService } from '../ai/whisper-client.service';
import { SpeechMetricsService } from '../ai/speech-metrics.service';
import type { EvaluateResponseJobData } from '../../interview/processors/interview-evaluation.processor';

export interface AnalyzeSpeechJobData {
  responseId: string;
  audioUrl: string;
  durationSeconds: number;
  clientTranscript?: string;
}

/**
 * Consumes the SPEECH_ANALYSIS queue (scaffolded in Phase 2, wired up
 * here): transcribes the uploaded audio (or uses a client-provided
 * transcript from the browser's Web Speech API), computes real speech
 * metrics, persists both, then hands the transcript off to the same
 * INTERVIEW_EVALUATION queue Phase 9 uses — so a voice answer gets
 * identical content scoring to a typed one, with speech metrics layered
 * on top rather than a separate scoring path.
 */
@Processor(QUEUE_NAMES.SPEECH_ANALYSIS)
export class SpeechAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(SpeechAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whisperClientService: WhisperClientService,
    private readonly speechMetricsService: SpeechMetricsService,
    @InjectQueue(QUEUE_NAMES.INTERVIEW_EVALUATION)
    private readonly evaluationQueue: Queue<EvaluateResponseJobData>,
  ) {
    super();
  }

  async process(job: Job<AnalyzeSpeechJobData>): Promise<void> {
    const { responseId, audioUrl, durationSeconds, clientTranscript } = job.data;

    let transcript: string;
    let metrics: {
      pronunciationScore: number | null;
      fluencyScore: number;
      confidenceScore: number;
      speakingSpeedWpm: number;
      fillerWordCount: number;
      pauseCount: number | null;
    };

    if (clientTranscript) {
      transcript = clientTranscript;
      metrics = this.speechMetricsService.computeFromTranscriptOnly(transcript, durationSeconds);
    } else if (this.whisperClientService.isConfigured()) {
      const audioBuffer = await this.downloadAudio(audioUrl);
      const result = await this.whisperClientService.transcribe(audioBuffer, 'answer.webm', 'audio/webm');
      transcript = result.text;
      metrics = this.speechMetricsService.computeFromWhisperSegments(
        transcript,
        result.segments,
        result.durationSeconds || durationSeconds,
      );
    } else {
      this.logger.warn(
        `Response ${responseId}: no client transcript and Whisper isn't configured — cannot transcribe. ` +
          'Have the frontend use the Web Speech API to provide a transcript, or configure OPENAI_API_KEY/WHISPER_API_KEY.',
      );
      return; // InterviewResponse.transcript stays null; GET /speech/analysis/:id reports "unavailable"
    }

    await this.prisma.$transaction([
      this.prisma.interviewResponse.update({
        where: { id: responseId },
        data: { transcript, answeredAt: new Date() },
      }),
      this.prisma.speechAnalysis.upsert({
        where: { responseId },
        create: { responseId, ...metrics },
        update: { ...metrics },
      }),
    ]);

    // Now that a transcript exists, run it through the same evaluator Phase 9
    // uses for typed answers — score/feedback shouldn't differ by input modality.
    await this.evaluationQueue.add(
      'evaluate-response',
      { responseId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  /**
   * Downloads the uploaded audio back from wherever StorageService put it —
   * a local /uploads/ static path or an S3-compatible URL. Plain fetch(),
   * not an authenticated SDK call: consistent with the same unsigned-PUT
   * limitation documented in storage.service.ts (an unsigned GET only
   * works if the bucket/object permits public reads; private AWS S3
   * would need @aws-sdk/client-s3's signed requests instead).
   */
  private async downloadAudio(audioUrl: string): Promise<Buffer> {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio from ${audioUrl}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
