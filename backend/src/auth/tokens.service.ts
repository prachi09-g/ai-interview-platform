import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import {
  JwtPayload,
  TokenPair,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a deterministic SHA-256 hash of a refresh token
   * before storing or looking it up in the database.
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Creates an access token.
   */
  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get(
        'auth.jwtAccessSecret',
        { infer: true },
      ),
      expiresIn: this.configService.get(
        'auth.jwtAccessExpiresIn',
        { infer: true },
      ),
    });
  }

  /**
   * Creates a refresh token.
   */
  private signRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get(
        'auth.jwtRefreshSecret',
        { infer: true },
      ),
      expiresIn: this.configService.get(
        'auth.jwtRefreshExpiresIn',
        { infer: true },
      ),
    });
  }

  /**
   * Issues a new access token + refresh token pair
   * and stores the refresh-token hash in the database.
   */
  async issueTokenPair(
    payload: JwtPayload,
    userAgent?: string,
  ): Promise<TokenPair> {
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    const decoded = this.jwtService.decode(
      refreshToken,
    ) as {
      exp: number;
    };

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
        userAgent,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verifies and rotates a refresh token.
   *
   * The old refresh token is revoked and a completely
   * new access/refresh pair is generated.
   */
  async rotateRefreshToken(
    refreshToken: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get(
            'auth.jwtRefreshSecret',
            { infer: true },
          ),
        },
      );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    const tokenHash = this.hashToken(refreshToken);

    const stored =
      await this.prisma.refreshToken.findUnique({
        where: {
          tokenHash,
        },
      });

    if (
      !stored ||
      stored.revoked ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or expired',
      );
    }

    // Revoke the refresh token that was just used.
    await this.prisma.refreshToken.update({
      where: {
        id: stored.id,
      },
      data: {
        revoked: true,
      },
    });

    /**
     * jwt.verify() returns standard JWT fields such as:
     *
     * iat = issued at
     * exp = expiration
     *
     * These MUST NOT be passed back into jwt.sign()
     * when expiresIn is also specified.
     *
     * Remove them before generating the new token pair.
     */
    const {
      exp: _exp,
      iat: _iat,
      ...cleanPayload
    } = payload as JwtPayload & {
      exp?: number;
      iat?: number;
    };

    return this.issueTokenPair(
      cleanPayload as JwtPayload,
      userAgent,
    );
  }

  /**
   * Revokes one refresh token.
   */
  async revokeRefreshToken(
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }

  /**
   * Revokes all active refresh tokens for a user.
   * Used for operations such as password reset.
   */
  async revokeAllUserTokens(
    userId: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }
}