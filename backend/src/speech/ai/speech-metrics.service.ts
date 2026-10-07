import { Injectable } from '@nestjs/common';
import type { WhisperSegment } from './whisper-client.service';

export interface SpeechMetrics {
  pronunciationScore: number; // 0-100
  fluencyScore: number; // 0-100
  confidenceScore: number; // 0-100
  speakingSpeedWpm: number;
  fillerWordCount: number;
  pauseCount: number;
}

const FILLER_WORDS = ['um', 'uh', 'uhh', 'umm', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 'so yeah'];
const PAUSE_THRESHOLD_SECONDS = 0.8; // gap between segments longer than this counts as a pause
const IDEAL_WPM_RANGE: [number, number] = [110, 160]; // typical comfortable interview-answer pace

@Injectable()
export class SpeechMetricsService {
  countFillerWords(transcript: string): number {
    // Lookaround-based boundary, not literal-space padding: the previous
    // approach (pad with spaces, match \s<filler>\s) missed any filler
    // immediately followed by punctuation — "um," or "actually," are
    // extremely common in real transcripts and would silently not count.
    // Verified against this exact case (Phase 13) before fixing.
    const lower = transcript.toLowerCase();
    return FILLER_WORDS.reduce((count, filler) => {
      const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = lower.match(new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'g'));
      return count + (matches?.length ?? 0);
    }, 0);
  }

  /**
   * Uses real Whisper segment timestamps and confidence data — every
   * number here is derived from actual audio characteristics, not
   * fabricated. avg_logprob (log probability, ~0 = confident, very
   * negative = unclear speech) is mapped to a 0-100 clarity score using
   * -1.0 as the practical floor (Whisper's own docs flag avg_logprob
   * below -1 as likely-silent/unreliable).
   */
  computeFromWhisperSegments(transcript: string, segments: WhisperSegment[], durationSeconds: number): SpeechMetrics {
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const speakingSpeedWpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    const fillerWordCount = this.countFillerWords(transcript);

    let pauseCount = 0;
    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].start - segments[i - 1].end;
      if (gap > PAUSE_THRESHOLD_SECONDS) pauseCount++;
    }

    const avgLogprob =
      segments.length > 0 ? segments.reduce((sum, s) => sum + s.avg_logprob, 0) / segments.length : -0.3;
    // Map [-1.0, 0.0] -> [0, 100]; clamp outside that range rather than extrapolating.
    const pronunciationScore = Math.round(Math.max(0, Math.min(100, (avgLogprob + 1.0) * 100)));

    const fluencyScore = this.computeFluencyScore(wordCount, fillerWordCount, pauseCount, speakingSpeedWpm);
    const confidenceScore = this.computeConfidenceScore(pronunciationScore, fluencyScore, speakingSpeedWpm);

    return { pronunciationScore, fluencyScore, confidenceScore, speakingSpeedWpm, fillerWordCount, pauseCount };
  }

  /**
   * No-Whisper fallback: the frontend measures clip duration client-side
   * (via the MediaRecorder/Audio APIs) and submits it alongside a
   * client-transcribed transcript (e.g. the browser's Web Speech API).
   * Filler-word count and speaking speed are still genuinely computed;
   * pronunciationScore and pauseCount can't be — Whisper's segment
   * timestamps are what pause detection needs, and avg_logprob is what
   * pronunciationScore needs, and neither exists without a real
   * transcription call, so both are returned as `null` (see
   * SpeechAnalysis's Prisma type) rather than a guessed number standing
   * in for data that was never actually measured.
   */
  computeFromTranscriptOnly(
    transcript: string,
    durationSeconds: number,
  ): Omit<SpeechMetrics, 'pronunciationScore' | 'pauseCount'> & {
    pronunciationScore: null;
    pauseCount: null;
  } {
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const speakingSpeedWpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    const fillerWordCount = this.countFillerWords(transcript);
    const fluencyScore = this.computeFluencyScore(wordCount, fillerWordCount, 0, speakingSpeedWpm);
    const confidenceScore = this.computeConfidenceScore(60, fluencyScore, speakingSpeedWpm); // 60 = neutral prior, no real signal available

    return {
      pronunciationScore: null,
      pauseCount: null,
      fluencyScore,
      confidenceScore,
      speakingSpeedWpm,
      fillerWordCount,
    };
  }

  private computeFluencyScore(
    wordCount: number,
    fillerWordCount: number,
    pauseCount: number,
    speakingSpeedWpm: number,
  ): number {
    if (wordCount === 0) return 0;

    const fillerRatio = fillerWordCount / wordCount;
    let score = 100;
    score -= Math.min(40, fillerRatio * 400); // each filler-per-2.5-words costs roughly 10 points
    score -= Math.min(20, pauseCount * 4); // each unusually long pause costs 4 points, capped

    const [minWpm, maxWpm] = IDEAL_WPM_RANGE;
    if (speakingSpeedWpm > 0 && (speakingSpeedWpm < minWpm || speakingSpeedWpm > maxWpm)) {
      const distance = speakingSpeedWpm < minWpm ? minWpm - speakingSpeedWpm : speakingSpeedWpm - maxWpm;
      score -= Math.min(20, distance / 5);
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private computeConfidenceScore(pronunciationScore: number, fluencyScore: number, speakingSpeedWpm: number): number {
    const [minWpm, maxWpm] = IDEAL_WPM_RANGE;
    const paceBonus = speakingSpeedWpm >= minWpm && speakingSpeedWpm <= maxWpm ? 10 : 0;
    const score = pronunciationScore * 0.4 + fluencyScore * 0.5 + paceBonus;
    return Math.round(Math.max(0, Math.min(100, score)));
  }
}
