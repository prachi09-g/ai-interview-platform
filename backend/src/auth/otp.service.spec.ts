import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: { otp: { create: jest.Mock; findMany: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      otp: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 10 } }, // otpExpiryMinutes = 10
      ],
    }).compile();

    service = module.get(OtpService);
  });

  describe('createOtp', () => {
    it('returns a 6-digit numeric plaintext code', async () => {
      const code = await service.createOtp('user-1', OtpPurpose.VERIFY_EMAIL);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('persists only the bcrypt hash, never the plaintext code', async () => {
      const code = await service.createOtp('user-1', OtpPurpose.VERIFY_EMAIL);
      expect(prisma.otp.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.otp.create.mock.calls[0][0];
      expect(createArgs.data.codeHash).not.toBe(code);
      await expect(bcrypt.compare(code, createArgs.data.codeHash)).resolves.toBe(true);
    });

    it('sets an expiry roughly `otpExpiryMinutes` minutes in the future', async () => {
      const before = Date.now();
      await service.createOtp('user-1', OtpPurpose.VERIFY_EMAIL);
      const createArgs = prisma.otp.create.mock.calls[0][0];
      const expiresAt = createArgs.data.expiresAt as Date;
      const expectedMs = before + 10 * 60 * 1000;
      // Allow a small tolerance for test execution time.
      expect(Math.abs(expiresAt.getTime() - expectedMs)).toBeLessThan(2000);
    });
  });

  describe('verifyOtp', () => {
    it('returns true and marks the OTP consumed on a matching code', async () => {
      const plaintext = '482913';
      const hash = await bcrypt.hash(plaintext, 10);
      prisma.otp.findMany.mockResolvedValue([{ id: 'otp-1', codeHash: hash }]);

      const result = await service.verifyOtp('user-1', OtpPurpose.VERIFY_EMAIL, plaintext);

      expect(result).toBe(true);
      expect(prisma.otp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('returns false for a non-matching code and does not consume anything', async () => {
      const hash = await bcrypt.hash('482913', 10);
      prisma.otp.findMany.mockResolvedValue([{ id: 'otp-1', codeHash: hash }]);

      const result = await service.verifyOtp('user-1', OtpPurpose.VERIFY_EMAIL, '000000');

      expect(result).toBe(false);
      expect(prisma.otp.update).not.toHaveBeenCalled();
    });

    it('returns false when there are no live (unconsumed/unexpired) candidates', async () => {
      prisma.otp.findMany.mockResolvedValue([]);
      const result = await service.verifyOtp('user-1', OtpPurpose.VERIFY_EMAIL, '123456');
      expect(result).toBe(false);
    });

    it('checks candidates in order and matches the first correct one among several', async () => {
      const correctHash = await bcrypt.hash('111111', 10);
      const wrongHash = await bcrypt.hash('222222', 10);
      prisma.otp.findMany.mockResolvedValue([
        { id: 'otp-newest', codeHash: wrongHash },
        { id: 'otp-older', codeHash: correctHash },
      ]);

      const result = await service.verifyOtp('user-1', OtpPurpose.VERIFY_EMAIL, '111111');

      expect(result).toBe(true);
      expect(prisma.otp.update).toHaveBeenCalledWith({
        where: { id: 'otp-older' },
        data: { consumedAt: expect.any(Date) },
      });
    });
  });
});
