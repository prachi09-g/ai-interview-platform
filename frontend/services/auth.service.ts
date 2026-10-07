import { apiClient } from '@/lib/api-client';
import type { ApiEnvelope, AuthResponse, SafeUser } from '@/types/auth.types';

export interface RegisterPayload {
  email: string;
  fullName: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<{ user: SafeUser }> {
    const res = await apiClient.post<ApiEnvelope<{ user: SafeUser }>>('/auth/register', payload);
    return res.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiEnvelope<AuthResponse>>('/auth/login', payload);
    return res.data.data;
  },

  async loginWithGoogle(code: string): Promise<AuthResponse> {
    const res = await apiClient.post<ApiEnvelope<AuthResponse>>('/auth/google', { code });
    return res.data.data;
  },

  async refresh(): Promise<{ accessToken: string }> {
    const res = await apiClient.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh');
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async verifyOtp(email: string, code: string): Promise<void> {
    await apiClient.post('/auth/verify-otp', { email, code });
  },

  async resendOtp(email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<void> {
    await apiClient.post('/auth/resend-otp', { email, purpose });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, code, newPassword });
  },

  async getMe(): Promise<SafeUser> {
    const res = await apiClient.get<ApiEnvelope<SafeUser>>('/users/me');
    return res.data.data;
  },
};
