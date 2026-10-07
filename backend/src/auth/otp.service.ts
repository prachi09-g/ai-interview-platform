import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Generates a cryptographically random 6-digit numeric code. */
  private generateCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * Creates and persists a new OTP for the given user/purpose, returning
   * the plaintext code so the caller can email it. Only the bcrypt hash of
   * the code is stored — the plaintext never touches the database.
   */
  async createOtp(userId: string, purpose: OtpPurpose): Promise<string> {
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const otpExpiryMinutes = this.configService.get('auth.otpExpiryMinutes', { infer: true });

    await this.prisma.otp.create({
      data: {
        userId,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
      },
    });

    return code;
  }

  /**
   * Verifies a submitted code against the most recent unconsumed,
   * unexpired OTP for this user/purpose. On success, marks it consumed so
   * it cannot be replayed.
   */
  async verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const candidates = await this.prisma.otp.findMany({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 5, // guard against a burst of resend requests leaving several live codes
    });

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const matches = await bcrypt.compare(code, candidate.codeHash);
      if (matches) {
        await this.prisma.otp.update({
          where: { id: candidate.id },
          data: { consumedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }
}
