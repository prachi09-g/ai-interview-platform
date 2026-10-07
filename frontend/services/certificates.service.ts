import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope } from '@/types/auth.types';
import type { Certificate } from '@/types/dashboard.types';

export const certificatesService = {
  async list(): Promise<Certificate[]> {
    const res = await apiClient.get<ApiEnvelope<Certificate[]>>('/certificates');
    return res.data.data;
  },

  async getDownloadUrl(id: string): Promise<{ url: string }> {
    const res = await apiClient.post<ApiEnvelope<{ url: string }>>(`/certificates/${id}/download`);
    return res.data.data;
  },
};
