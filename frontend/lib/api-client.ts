import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL } from './constants';
import { useAuthStore } from '@/store/auth-store';
import type {
  ApiEnvelope,
  AuthResponse,
} from '@/types/auth.types';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
);

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiEnvelope<{ accessToken: string }>>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        const { accessToken } = res.data.data;

        useAuthStore
          .getState()
          .setAccessToken(accessToken);

        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise!;
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | InternalAxiosRequestConfig
      | undefined;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/');

    const shouldRetry =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint;

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;

      const newAccessToken =
        await refreshAccessToken();

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore
        .getState()
        .clearSession();

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  if (axios.isAxiosError(error)) {
    const message = (
      error.response?.data as
        | {
            message?: string | string[];
          }
        | undefined
    )?.message;

    if (Array.isArray(message)) {
      return message[0] ?? fallback;
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

export type { AuthResponse };