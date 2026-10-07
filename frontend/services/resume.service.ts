import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type {
  AtsReport,
  Resume,
  ResumeAnalysis,
  ResumeTemplate,
} from '@/types/resume.types';

export const resumeService = {
  async upload(file: File): Promise<Resume> {
    const formData = new FormData();

    // Must match FileInterceptor('file') in the NestJS controller
    formData.append('file', file, file.name);

    const res = await apiClient.post<ApiEnvelope<Resume>>(
      '/resume/upload',
      formData,
      {
        // The shared apiClient uses application/json by default.
        // Remove it for this request so Axios/browser can generate
        // multipart/form-data with the correct boundary.
        headers: {
          'Content-Type': undefined,
        },
      },
    );

    return res.data.data;
  },

  async list(): Promise<Resume[]> {
    const res =
      await apiClient.get<ApiEnvelope<Resume[]>>('/resume');

    return res.data.data;
  },

  async analyze(
    resumeId: string,
    targetJobRole?: string,
  ): Promise<ResumeAnalysis> {
    const res =
      await apiClient.post<ApiEnvelope<ResumeAnalysis>>(
        `/resume/${resumeId}/analyze`,
        {
          targetJobRole,
        },
      );

    return res.data.data;
  },

  async getAnalysis(
    resumeId: string,
  ): Promise<ResumeAnalysis | null> {
    try {
      const res =
        await apiClient.get<ApiEnvelope<ResumeAnalysis>>(
          `/resume/${resumeId}/analysis`,
        );

      return res.data.data;
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }

      throw error;
    }
  },

  async getAtsReport(
    resumeId: string,
  ): Promise<AtsReport> {
    const res =
      await apiClient.get<ApiEnvelope<AtsReport>>(
        `/resume/${resumeId}/ats-report`,
      );

    return res.data.data;
  },

  async remove(resumeId: string): Promise<void> {
    await apiClient.delete(`/resume/${resumeId}`);
  },

  async listTemplates(): Promise<ResumeTemplate[]> {
    const res =
      await apiClient.get<ApiEnvelope<ResumeTemplate[]>>(
        '/resume/templates',
      );

    return res.data.data;
  },
};

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as {
      response?: {
        status?: number;
      };
    }).response?.status === 404
  );
}