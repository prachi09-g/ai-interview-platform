export type UserRole = 'STUDENT' | 'ADMIN';

export interface SafeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
}

/** Matches the backend's global TransformInterceptor envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
  timestamp: string;
}

/** Matches the backend's global AllExceptionsFilter error envelope. */
export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
  error?: string;
}
