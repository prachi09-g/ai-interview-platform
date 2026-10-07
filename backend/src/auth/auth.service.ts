import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../config/configuration';
import { UsersService, UserWithRole } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { TokensService } from './tokens.service';
import { OtpService } from './otp.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtPayload, TokenPair } from './interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendOtpPurpose } from './dto/resend-otp.dto';

export interface SafeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
}

function toSafeUser(user: UserWithRole): SafeUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role.name,
  };
}

function toJwtPayload(user: UserWithRole): JwtPayload {
  return { sub: user.id, email: user.email, role: user.role.name };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
    private readonly tokensService: TokensService,
    private readonly otpService: OtpService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const saltRounds = this.configService.get('auth.bcryptSaltRounds', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersService.createStudent({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
    });

    const code = await this.otpService.createOtp(user.id, OtpPurpose.VERIFY_EMAIL);
    await this.mailService.sendOtpEmail(user.email, code, 'VERIFY_EMAIL');

    await this.notificationsService.createForUser(
      user.id,
      'Welcome to AI Interview Prep 👋',
      'Verify your email to unlock mock interviews, resume analysis, and coding practice.',
    );
    await this.achievementsService.awardBadge(user.id, 'EARLY_ADOPTER');

    return { user: toSafeUser(user) };
  }

  async login(dto: LoginDto, userAgent?: string): Promise<{ user: SafeUser } & TokenPair> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      // Same generic message whether the account doesn't exist or is Google-only,
      // to avoid leaking which emails are registered.
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in. Use /auth/resend-otp to get a new code.',
      );
    }

    const tokens = await this.tokensService.issueTokenPair(toJwtPayload(user), userAgent);
    return { user: toSafeUser(user), ...tokens };
  }

  async loginWithGoogle(code: string, userAgent?: string): Promise<{ user: SafeUser } & TokenPair> {
    const profile = await this.googleOAuthService.exchangeCodeForProfile(code);

    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(profile.email);

      if (existingByEmail) {
        // Same email registered via password previously — link the Google identity.
        await this.usersService.linkGoogleId(existingByEmail.id, profile.googleId);
        user = await this.usersService.findByGoogleId(profile.googleId);
      } else {
        user = await this.usersService.createStudent({
          email: profile.email,
          fullName: profile.fullName,
          googleId: profile.googleId,
          emailVerified: profile.emailVerified,
        });
        await this.notificationsService.createForUser(
          user.id,
          'Welcome to AI Interview Prep 👋',
          'Your account is ready — start with a mock interview or upload your resume.',
        );
        await this.achievementsService.awardBadge(user.id, 'EARLY_ADOPTER');
      }
    }

    if (!user) {
      // Unreachable in practice, but keeps TypeScript's control-flow analysis happy
      // and guards against an unexpected null from the lookups above.
      throw new UnauthorizedException('Unable to resolve Google account');
    }

    if (!user.isActive) {
      throw new ForbiddenException('This account has been deactivated');
    }

    const tokens = await this.tokensService.issueTokenPair(toJwtPayload(user), userAgent);
    return { user: toSafeUser(user), ...tokens };
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<TokenPair> {
    return this.tokensService.rotateRefreshToken(refreshToken, userAgent);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokensService.revokeRefreshToken(refreshToken);
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or code');
    }

    const isValid = await this.otpService.verifyOtp(user.id, OtpPurpose.VERIFY_EMAIL, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.usersService.markEmailVerified(user.id);
  }

  async resendOtp(email: string, purpose: ResendOtpPurpose): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Deliberately silent no-op for unknown emails — do not reveal account existence.
    if (!user) {
      return;
    }

    if (purpose === ResendOtpPurpose.VERIFY_EMAIL && user.emailVerified) {
      return; // already verified, nothing to resend
    }

    const otpPurpose = purpose === ResendOtpPurpose.VERIFY_EMAIL
      ? OtpPurpose.VERIFY_EMAIL
      : OtpPurpose.RESET_PASSWORD;

    const code = await this.otpService.createOtp(user.id, otpPurpose);
    await this.mailService.sendOtpEmail(user.email, code, otpPurpose);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Silent no-op for unknown emails — do not reveal account existence.
    if (!user || !user.passwordHash) {
      return;
    }

    const code = await this.otpService.createOtp(user.id, OtpPurpose.RESET_PASSWORD);
    await this.mailService.sendOtpEmail(user.email, code, 'RESET_PASSWORD');
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or code');
    }

    const isValid = await this.otpService.verifyOtp(user.id, OtpPurpose.RESET_PASSWORD, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const saltRounds = this.configService.get('auth.bcryptSaltRounds', { infer: true });
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.usersService.updatePasswordHash(user.id, passwordHash);

    // Reset invalidates every existing session, forcing re-login everywhere.
    await this.tokensService.revokeAllUserTokens(user.id);
  }
}
