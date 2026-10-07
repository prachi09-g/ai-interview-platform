import { RoleName } from '@prisma/client';

/** Shape of the payload encoded into both access and refresh JWTs. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: RoleName;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
