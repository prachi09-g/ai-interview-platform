import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

export interface WhisperSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  avg_logprob: number; // ~0 (confident) to very negative (unclear/noisy audio)
  no_speech_prob: number; // 0-1, probability this segment is silence/non-speech
}

export interface TranscriptionResult {
  text: string;
  durationSeconds: number;
  segments: WhisperSegment[];
}

interface WhisperVerboseJsonResponse {
  text: string;
  duration: number;
  segments?: WhisperSegment[];
  error?: { message?: string };
}

/**
 * Wraps OpenAI's Whisper transcription endpoint (real multipart upload via
 * fetch — no SDK dependency, same pattern as GoogleOAuthService/ResumeAiService).
 * Requesting response_format=verbose_json (rather than the default plain
 * text) is what makes real speech-metric computation possible downstream:
 * segment start/end timestamps enable genuine pause detection and
 * speaking-speed calculation from actual audio duration, and avg_logprob
 * is a genuine (if imperfect) signal of speech clarity — not fabricated.
 */
@Injectable()
export class WhisperClientService {
  private readonly logger = new Logger(WhisperClientService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  isConfigured(): boolean {
    const ai = this.configService.get('ai', { infer: true });
    return !!ai.whisperApiKey || !!ai.openaiApiKey;
  }

  async transcribe(audioBuffer: Buffer, filename: string, mimeType: string): Promise<TranscriptionResult> {
    const ai = this.configService.get('ai', { infer: true });
    const apiKey = ai.whisperApiKey || ai.openaiApiKey;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Speech transcription requires WHISPER_API_KEY or OPENAI_API_KEY to be configured.',
      );
    }

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const body = (await response.json()) as WhisperVerboseJsonResponse;
    if (!response.ok) {
      this.logger.error(`Whisper API error: ${body.error?.message ?? response.statusText}`);
      throw new ServiceUnavailableException('Speech transcription failed. Please try again.');
    }

    return {
      text: body.text,
      durationSeconds: body.duration,
      segments: body.segments ?? [],
    };
  }
}
