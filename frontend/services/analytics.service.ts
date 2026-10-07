import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { AdminOverview, DomainAnalytics, StudentProgress } from '@/types/analytics.types';

export const analyticsService = {
  async getProgress(): Promise<StudentProgress> {
    const res = await apiClient.get<ApiEnvelope<StudentProgress>>('/analytics/progress');
    return res.data.data;
  },

  async getAdminOverview(): Promise<AdminOverview> {
    const res = await apiClient.get<ApiEnvelope<AdminOverview>>('/analytics/overview');
    return res.data.data;
  },

  async getDomainAnalytics(categoryId: string): Promise<DomainAnalytics> {
    const res = await apiClient.get<ApiEnvelope<DomainAnalytics>>(`/analytics/domain/${categoryId}`);
    return res.data.data;
  },
};
