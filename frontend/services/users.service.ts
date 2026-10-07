import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { UpdateProfilePayload, UserWithProfile } from '@/types/dashboard.types';

export const usersService = {
  async getMe(): Promise<UserWithProfile> {
    const res = await apiClient.get<ApiEnvelope<UserWithProfile>>('/users/me');
    return res.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserWithProfile> {
    const res = await apiClient.patch<ApiEnvelope<UserWithProfile>>('/users/me/profile', payload);
    return res.data.data;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
  },
};
