import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { LeaderboardPeriod, LeaderboardResponse } from '@/types/dashboard.types';

export const leaderboardService = {
  async get(params: { categoryId?: string; period?: LeaderboardPeriod } = {}): Promise<LeaderboardResponse> {
    const res = await apiClient.get<ApiEnvelope<LeaderboardResponse>>('/leaderboard', { params });
    return res.data.data;
  },
};
