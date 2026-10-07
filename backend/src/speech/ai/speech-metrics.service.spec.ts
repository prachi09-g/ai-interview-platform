import { Test, TestingModule } from '@nestjs/testing';
import { SpeechMetricsService } from './speech-metrics.service';
import type { WhisperSegment } from './whisper-client.service';

describe('SpeechMetricsService', () => {
  let service: SpeechMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeechMetricsService],
    }).compile();
    service = module.get(SpeechMetricsService);
  });

  describe('countFillerWords', () => {
    it('counts common filler words', () => {
      expect(service.countFillerWords('um, so, uh, I think this is like really good')).toBe(3);
    });

    it('counts fillers immediately followed by punctuation', () => {
      // Regression test: a naive \s-padded match misses "um," / "actually,"
      // since the character after the filler is punctuation, not whitespace.
      expect(service.countFillerWords('Well, um, actually, I believe so.')).toBe(2);
    });

    it('does not false-positive on a filler word as a substring of another word', () => {
      expect(service.countFillerWords('I liked the design')).toBe(0);
    });

    it('counts multi-word fillers', () => {
      expect(service.countFillerWords('It was, you know, pretty good')).toBe(1);
    });

    it('is case-insensitive', () => {
      expect(service.countFillerWords('UM this is UH a test')).toBe(2);
    });
  });

  describe('computeFromWhisperSegments', () => {
    const makeSegment = (start: number, end: number, avg_logprob = -0.2): WhisperSegment => ({
      start,
      end,
      avg_logprob,
      text: '',
      no_speech_prob: 0.05,
    });

    it('computes speaking speed from word count and duration', () => {
      const transcript = Array(20).fill('word').join(' '); // 20 words
      const result = service.computeFromWhisperSegments(transcript, [makeSegment(0, 10)], 10);
      expect(result.speakingSpeedWpm).toBe(120); // 20 words / 10s * 60
    });

    it('counts pauses between segments exceeding the threshold', () => {
      const segments = [makeSegment(0, 5), makeSegment(6, 10), makeSegment(10.2, 15)];
      // Gap 1: 6 - 5 = 1.0s (> 0.8 threshold) -> pause
      // Gap 2: 10.2 - 10 = 0.2s (< 0.8 threshold) -> not a pause
      const result = service.computeFromWhisperSegments('some words here today now', segments, 15);
      expect(result.pauseCount).toBe(1);
    });

    it('maps avg_logprob to a bounded pronunciation score', () => {
      const confident = service.computeFromWhisperSegments('a b c d e', [makeSegment(0, 5, 0)], 5);
      const unclear = service.computeFromWhisperSegments('a b c d e', [makeSegment(0, 5, -1.5)], 5);
      expect(confident.pronunciationScore).toBeGreaterThan(unclear.pronunciationScore);
      expect(confident.pronunciationScore).toBeLessThanOrEqual(100);
      expect(unclear.pronunciationScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('computeFromTranscriptOnly', () => {
    it('returns null for pronunciationScore and pauseCount (no Whisper data to measure them from)', () => {
      const result = service.computeFromTranscriptOnly('This is a client-transcribed answer.', 5);
      expect(result.pronunciationScore).toBeNull();
      expect(result.pauseCount).toBeNull();
    });

    it('still computes fillerWordCount and speakingSpeedWpm deterministically', () => {
      const transcript = Array(20).fill('word').join(' ');
      const result = service.computeFromTranscriptOnly(transcript, 10);
      expect(result.speakingSpeedWpm).toBe(120);
      expect(result.fillerWordCount).toBe(0);
    });
  });
});
