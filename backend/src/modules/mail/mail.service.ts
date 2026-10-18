import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends email through SMTP. Without SMTP_HOST (local development) messages are
 * written to the log instead, so flows like password reset stay testable.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('mail.host');
    this.from = config.getOrThrow<string>('mail.from');

    if (host) {
      const user = config.get<string>('mail.user');
      const password = config.get<string>('mail.password');
      this.transporter = nodemailer.createTransport({
        host,
        port: config.getOrThrow<number>('mail.port'),
        secure: config.getOrThrow<boolean>('mail.secure'),
        auth:
          user && password !== undefined ? { user, pass: password } : undefined,
      });
    }
  }

  /** Resolves to true when the message was handed to an SMTP server. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured; email to ${message.to} not sent. Subject: ${message.subject}`,
      );
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (error) {
      // Mail failure must not break the request that triggered it.
      this.logger.error(
        `Failed to send email to ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
