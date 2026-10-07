import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { Achievement } from '@/types/dashboard.types';

export const achievementsService = {
  async list(): Promise<Achievement[]> {
    const res = await apiClient.get<ApiEnvelope<Achievement[]>>('/achievements');
    return res.data.data;
  },
};
