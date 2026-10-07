import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';

export interface StudentFeedback {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFeedbackPayload {
  subject: string;
  message: string;
}

export const feedbackService = {
  async create(
    payload: CreateFeedbackPayload,
  ): Promise<StudentFeedback> {
    const res = await apiClient.post<
      ApiEnvelope<StudentFeedback>
    >('/feedback', payload);

    return res.data.data;
  },

  async mine(): Promise<StudentFeedback[]> {
    const res = await apiClient.get<
      ApiEnvelope<StudentFeedback[]>
    >('/feedback/mine');

    return res.data.data;
  },
};