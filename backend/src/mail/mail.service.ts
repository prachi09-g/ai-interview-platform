import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string;
  private readonly smtpConfigured: boolean;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const mailConfig = this.configService.get('mail', { infer: true });
    this.fromAddress = mailConfig.from ?? 'AI Interview Platform <no-reply@aiinterview.dev>';
    this.smtpConfigured = !!(mailConfig.host && mailConfig.user && mailConfig.password);

    this.transporter = this.smtpConfigured
      ? nodemailer.createTransport({
          host: mailConfig.host,
          port: mailConfig.port ?? 587,
          secure: (mailConfig.port ?? 587) === 465,
          auth: { user: mailConfig.user, pass: mailConfig.password },
        })
      : null;

    if (!this.smtpConfigured) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — emails will be logged ' +
          'to the console instead of sent. Configure backend/.env for real delivery.',
      );
    }
  }

  private async send(to: string, subject: string, html: string, textFallback: string): Promise<void> {
    if (!this.smtpConfigured || !this.transporter) {
      this.logger.log(`[DEV MAIL] To: ${to} | Subject: ${subject}\n${textFallback}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html,
      text: textFallback,
    });
  }

  async sendOtpEmail(to: string, code: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<void> {
    const isVerify = purpose === 'VERIFY_EMAIL';
    const subject = isVerify ? 'Verify your email address' : 'Reset your password';
    const intro = isVerify
      ? 'Use the code below to verify your email address and activate your account.'
      : 'Use the code below to reset your password.';

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>AI Interview Preparation Platform</h2>
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>This code expires shortly. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
    const textFallback = `${intro}\n\nCode: ${code}\n\nThis code expires shortly.`;

    await this.send(to, subject, html, textFallback);
  }
}
