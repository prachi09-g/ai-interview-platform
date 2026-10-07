import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

/**
 * Exchanges the one-time authorization `code` the frontend receives from
 * Google Identity Services for the user's profile. Implemented as a plain
 * HTTPS call to Google's token + userinfo endpoints (rather than
 * passport-google-oauth20, which assumes a server-driven redirect flow) to
 * match the POST /auth/google code-exchange contract defined in the
 * Phase 1 API design — the natural fit for a Next.js SPA frontend.
 */
@Injectable()
export class GoogleOAuthService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
    const { googleClientId, googleClientSecret, googleCallbackUrl } = this.configService.get(
      'auth',
      { infer: true },
    );

    if (!googleClientId || !googleClientSecret || !googleCallbackUrl) {
      throw new UnauthorizedException('Google OAuth is not configured on this server');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenBody = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new UnauthorizedException(
        `Google code exchange failed: ${tokenBody.error_description ?? tokenBody.error ?? 'unknown error'}`,
      );
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }

    const profile = (await userInfoResponse.json()) as GoogleUserInfoResponse;

    return {
      googleId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
      fullName: profile.name ?? profile.email.split('@')[0],
    };
  }
}
