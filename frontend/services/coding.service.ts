import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type {
  CodingQuestionDetail,
  CodingQuestionSummary,
  CodingSubmission,
  Difficulty,
  PaginatedResult,
} from '@/types/coding.types';

export const codingService = {
  async listQuestions(
    params: { categoryId?: string; difficulty?: Difficulty; search?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<CodingQuestionSummary>> {
    const res = await apiClient.get<ApiEnvelope<PaginatedResult<CodingQuestionSummary>>>('/coding/questions', {
      params,
    });
    return res.data.data;
  },

  async getQuestion(id: string): Promise<CodingQuestionDetail> {
    const res = await apiClient.get<ApiEnvelope<CodingQuestionDetail>>(`/coding/questions/${id}`);
    return res.data.data;
  },

  async submit(questionId: string, language: string, code: string): Promise<CodingSubmission> {
    const res = await apiClient.post<ApiEnvelope<CodingSubmission>>(`/coding/questions/${questionId}/submit`, {
      language,
      code,
    });
    return res.data.data;
  },

  async getSubmission(id: string): Promise<CodingSubmission> {
    const res = await apiClient.get<ApiEnvelope<CodingSubmission>>(`/coding/submissions/${id}`);
    return res.data.data;
  },

  async listSubmissions(
    params: { questionId?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<CodingSubmission>> {
    const res = await apiClient.get<ApiEnvelope<PaginatedResult<CodingSubmission>>>('/coding/submissions', {
      params,
    });
    return res.data.data;
  },
};
