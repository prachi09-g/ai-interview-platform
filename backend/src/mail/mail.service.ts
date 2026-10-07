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
  private readonly isProduction: boolean;
  private readonly brevoApiKey?: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const mailConfig = this.configService.get('mail', { infer: true });

    this.fromAddress =
      mailConfig.from ??
      'AI Interview Platform <no-reply@aiinterview.dev>';

    this.smtpConfigured = !!(
      mailConfig.host &&
      mailConfig.user &&
      mailConfig.password
    );

    this.isProduction = process.env.NODE_ENV === 'production';

    // On Render production, BREVO_API_KEY will be used with Brevo's HTTPS API.
    this.brevoApiKey = process.env.BREVO_API_KEY;

    // SMTP is used only outside production.
    this.transporter =
      !this.isProduction && this.smtpConfigured
        ? nodemailer.createTransport({
            host: mailConfig.host,
            port: mailConfig.port ?? 587,
            secure: (mailConfig.port ?? 587) === 465,
            auth: {
              user: mailConfig.user,
              pass: mailConfig.password,
            },
          })
        : null;

    if (this.isProduction && !this.brevoApiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not configured — production emails cannot be sent.',
      );
    }

    if (!this.isProduction && !this.smtpConfigured) {
      this.logger.warn(
        'SMTP is not configured — development emails will be logged to the console.',
      );
    }
  }

  private parseFromAddress(): { name: string; email: string } {
    const match = this.fromAddress.match(/^(.*?)\s*<([^>]+)>$/);

    if (match) {
      return {
        name: match[1].trim() || 'AI Interview Platform',
        email: match[2].trim(),
      };
    }

    return {
      name: 'AI Interview Platform',
      email: this.fromAddress.trim(),
    };
  }

  private async sendWithBrevoApi(
    to: string,
    subject: string,
    html: string,
    textFallback: string,
  ): Promise<void> {
    if (!this.brevoApiKey) {
      throw new Error(
        'BREVO_API_KEY is required to send email in production.',
      );
    }

    const sender = this.parseFromAddress();

    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: textFallback,
        }),
      },
    );

    if (!response.ok) {
      const responseBody = await response.text();

      this.logger.error(
        `Brevo API email failed (${response.status}): ${responseBody}`,
      );

      throw new Error(
        `Brevo API email failed with status ${response.status}`,
      );
    }
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    textFallback: string,
  ): Promise<void> {
    // Render production: use HTTPS instead of SMTP.
    if (this.isProduction) {
      await this.sendWithBrevoApi(
        to,
        subject,
        html,
        textFallback,
      );
      return;
    }

    // Local development: continue using existing SMTP setup.
    if (this.smtpConfigured && this.transporter) {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: textFallback,
      });
      return;
    }

    // Development fallback when SMTP is not configured.
    this.logger.log(
      `[DEV MAIL] To: ${to} | Subject: ${subject}\n${textFallback}`,
    );
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ): Promise<void> {
    const isVerify = purpose === 'VERIFY_EMAIL';

    const subject = isVerify
      ? 'Verify your email address'
      : 'Reset your password';

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

    const textFallback =
      `${intro}\n\nCode: ${code}\n\nThis code expires shortly.`;

    await this.send(
      to,
      subject,
      html,
      textFallback,
    );
  }
}