export interface SpeechAnalysisResult {
  id: string;
  responseId: string;
  pronunciationScore: number | null;
  fluencyScore: number;
  confidenceScore: number;
  speakingSpeedWpm: number;
  fillerWordCount: number;
  pauseCount: number | null;
  createdAt: string;
}

export type SpeechAnalysisStatus = 'not_started' | 'processing' | 'ready';

export interface SpeechAnalysisPollResult {
  status: SpeechAnalysisStatus;
  analysis: SpeechAnalysisResult | null;
}

export interface TranscribeUploadResult {
  responseId: string;
  audioUrl: string;
  status: 'processing';
}
