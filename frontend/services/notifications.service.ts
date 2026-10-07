import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { NotificationsResponse } from '@/types/dashboard.types';

export const notificationsService = {
  async list(params: { unreadOnly?: boolean; page?: number; limit?: number } = {}): Promise<NotificationsResponse> {
    const res = await apiClient.get<ApiEnvelope<NotificationsResponse>>('/notifications', { params });
    return res.data.data;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },
};
