import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type {
  SpeechAnalysisPollResult,
  TranscribeUploadResult,
} from '@/types/speech.types';

export const speechService = {
  async transcribe(
    responseId: string,
    audioBlob: Blob,
    durationSeconds: number,
    clientTranscript?: string,
  ): Promise<TranscribeUploadResult> {
    const formData = new FormData();

    // Must match FileInterceptor('audio') in speech.controller.ts
    formData.append('audio', audioBlob, 'answer.webm');

    formData.append('responseId', responseId);
    formData.append('durationSeconds', String(durationSeconds));

    if (clientTranscript) {
      formData.append('transcript', clientTranscript);
    }

    const res = await apiClient.post<ApiEnvelope<TranscribeUploadResult>>(
      '/speech/transcribe',
      formData,
      {
        // apiClient defaults to application/json.
        // Remove that header for this request so Axios/browser creates:
        // multipart/form-data; boundary=...
        headers: {
          'Content-Type': undefined,
        },
      },
    );

    return res.data.data;
  },

  async getAnalysis(
    responseId: string,
  ): Promise<SpeechAnalysisPollResult> {
    const res = await apiClient.get<ApiEnvelope<SpeechAnalysisPollResult>>(
      `/speech/analysis/${responseId}`,
    );

    return res.data.data;
  },
};