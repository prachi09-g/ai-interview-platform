import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { InterviewCategory, MockInterviewSummary, PaginatedResult } from '@/types/dashboard.types';
import type {
  CreateInterviewPayload,
  InterviewResponseDetail,
  MockInterviewDetail,
  MockInterviewSummaryDetail,
  SessionQuestion,
} from '@/types/interview.types';

export const interviewService = {
  async listCategories(): Promise<InterviewCategory[]> {
    const res = await apiClient.get<ApiEnvelope<InterviewCategory[]>>('/interviews/categories');
    return res.data.data;
  },

  async listHistory(params: { page?: number; limit?: number } = {}): Promise<PaginatedResult<MockInterviewSummary>> {
    const res = await apiClient.get<ApiEnvelope<PaginatedResult<MockInterviewSummary>>>('/interviews', {
      params,
    });
    return res.data.data;
  },

  async toggleBookmark(id: string): Promise<MockInterviewSummary> {
    const res = await apiClient.patch<ApiEnvelope<MockInterviewSummary>>(`/interviews/${id}/bookmark`);
    return res.data.data;
  },

  // --- Phase 9: session lifecycle ---------------------------------------------

  async create(payload: CreateInterviewPayload): Promise<MockInterviewSummaryDetail> {
    const res = await apiClient.post<ApiEnvelope<MockInterviewSummaryDetail>>('/interviews', payload);
    return res.data.data;
  },

  async getOne(id: string): Promise<MockInterviewDetail> {
    const res = await apiClient.get<ApiEnvelope<MockInterviewDetail>>(`/interviews/${id}`);
    return res.data.data;
  },

  async getQuestions(id: string): Promise<SessionQuestion[]> {
    const res = await apiClient.get<ApiEnvelope<SessionQuestion[]>>(`/interviews/${id}/questions`);
    return res.data.data;
  },

  async submitResponse(id: string, questionId: string, transcript: string): Promise<InterviewResponseDetail> {
    const res = await apiClient.post<ApiEnvelope<InterviewResponseDetail>>(`/interviews/${id}/responses`, {
      questionId,
      transcript,
    });
    return res.data.data;
  },

  async getResponse(id: string, responseId: string): Promise<InterviewResponseDetail> {
    const res = await apiClient.get<ApiEnvelope<InterviewResponseDetail>>(
      `/interviews/${id}/responses/${responseId}`,
    );
    return res.data.data;
  },

  async complete(id: string): Promise<MockInterviewSummaryDetail> {
    const res = await apiClient.post<ApiEnvelope<MockInterviewSummaryDetail>>(`/interviews/${id}/complete`);
    return res.data.data;
  },
};
