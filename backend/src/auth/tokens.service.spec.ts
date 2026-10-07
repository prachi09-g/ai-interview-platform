import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { TokensService } from './tokens.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '@prisma/client';

const PAYLOAD = { sub: 'user-1', email: 'jane@example.com', role: RoleName.STUDENT };

function hashToken(token: string): string {
  // Mirrors TokensService's private hashToken() exactly, so tests can
  // predict what hash the service will look up by without reaching into
  // its private implementation.
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('TokensService', () => {
  let service: TokensService;
  let jwtService: { sign: jest.Mock; verify: jest.Mock; decode: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const CONFIG = {
    jwtAccessSecret: 'access-secret',
    jwtAccessExpiresIn: '15m',
    jwtRefreshSecret: 'refresh-secret',
    jwtRefreshExpiresIn: '7d',
  };

  beforeEach(async () => {
    jwtService = { sign: jest.fn(), verify: jest.fn(), decode: jest.fn() };
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (key: string) => (CONFIG as Record<string, string>)[key.split('.')[1]] } },
      ],
    }).compile();

    service = module.get(TokensService);
  });

  describe('issueTokenPair', () => {
    it('signs an access token and a refresh token with their respective secrets/expiry', async () => {
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await service.issueTokenPair(PAYLOAD);

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, PAYLOAD, {
        secret: 'access-secret',
        expiresIn: '15m',
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(2, PAYLOAD, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });
    });

    it('persists the refresh token as a SHA-256 hash, never the plaintext', async () => {
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('my-refresh-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      await service.issueTokenPair(PAYLOAD, 'test-agent');

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenHash: hashToken('my-refresh-token'),
          userAgent: 'test-agent',
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('rotateRefreshToken', () => {
    it('throws when the JWT signature/expiry check fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.rotateRefreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('throws when the token is valid but not found in the database', async () => {
      jwtService.verify.mockReturnValue(PAYLOAD);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('unknown-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the stored token has already been revoked (replay attempt)', async () => {
      jwtService.verify.mockReturnValue(PAYLOAD);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(service.rotateRefreshToken('replayed-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the stored token has expired', async () => {
      jwtService.verify.mockReturnValue(PAYLOAD);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.rotateRefreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('revokes the old token and issues a brand-new pair on success', async () => {
      jwtService.verify.mockReturnValue(PAYLOAD);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await service.rotateRefreshToken('valid-old-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revoked: true },
      });
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });
  });

  describe('revokeRefreshToken', () => {
    it('revokes only the matching, not-already-revoked token', async () => {
      await service.revokeRefreshToken('some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashToken('some-token'), revoked: false },
        data: { revoked: true },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revokes every non-revoked token for the given user', async () => {
      await service.revokeAllUserTokens('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });
  });
});
