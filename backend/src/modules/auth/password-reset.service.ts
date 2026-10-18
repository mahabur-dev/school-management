import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateNumericCode,
  generateOpaqueToken,
  hashToken,
} from '../../common/helpers/token.helper';
import { AuthTokenType, SchoolStatus, UserStatus } from '../../prisma';
import { MailService } from '../mail/mail.service';
import { getPasswordResetTemplate } from '../mail/templates/password-reset.template';
import { AuthTokensRepository } from './auth-tokens.repository';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

/**
 * Password reset is a two-step flow so the emailed code is never used to set
 * the password directly:
 *   forgot-password -> (email 6-digit code) -> verify-reset-otp -> reset-password
 */
@Injectable()
export class PasswordResetService {
  private readonly appName: string;
  private readonly codeTtl: number;
  private readonly grantTtl: number;
  private readonly exposeDevelopmentTokens: boolean;

  constructor(
    config: ConfigService,
    private readonly users: AuthRepository,
    private readonly tokens: AuthTokensRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
  ) {
    this.appName = config.getOrThrow<string>('app.name');
    this.codeTtl = config.getOrThrow<number>('auth.passwordResetExpiresIn');
    this.grantTtl = config.getOrThrow<number>(
      'auth.passwordResetGrantExpiresIn',
    );
    this.exposeDevelopmentTokens = config.getOrThrow<boolean>(
      'auth.exposeDevelopmentTokens',
    );
  }

  /** Always answers the same way, so it cannot be used to discover accounts. */
  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);
    let code: string | undefined;

    if (
      user &&
      user.status === UserStatus.ACTIVE &&
      user.school?.status !== SchoolStatus.SUSPENDED
    ) {
      await this.tokens.invalidateActive(
        user.id,
        AuthTokenType.PASSWORD_RESET_VERIFIED,
      );
      await this.tokens.invalidateActive(user.id, AuthTokenType.PASSWORD_RESET);

      code = generateNumericCode();
      await this.tokens.create({
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
        tokenHash: this.hashCode(user.id, code),
        expiresAt: new Date(Date.now() + this.codeTtl * 1000),
      });
      await this.mail.send({
        to: user.email,
        ...getPasswordResetTemplate({
          appName: this.appName,
          code,
          expiresInMinutes: Math.max(1, Math.ceil(this.codeTtl / 60)),
        }),
      });
    }

    return {
      message:
        'If the account exists, password reset instructions have been sent',
      ...(this.exposeDevelopmentTokens && code
        ? { passwordResetCode: code }
        : {}),
    };
  }

  async verifyResetOtp(email: string, code: string) {
    const user = await this.users.findByEmail(email);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or expired password reset code');
    }

    const consumed = await this.tokens.consumeForUser(
      user.id,
      this.hashCode(user.id, code),
      AuthTokenType.PASSWORD_RESET,
    );
    if (!consumed) {
      throw new UnauthorizedException('Invalid or expired password reset code');
    }

    const resetToken = generateOpaqueToken();
    await this.tokens.create({
      userId: user.id,
      type: AuthTokenType.PASSWORD_RESET_VERIFIED,
      tokenHash: hashToken(resetToken),
      expiresAt: new Date(Date.now() + this.grantTtl * 1000),
    });
    return { resetToken, expiresIn: this.grantTtl };
  }

  async resetPassword(resetToken: string | undefined, dto: ResetPasswordDto) {
    if (!resetToken) {
      throw new UnauthorizedException(
        'Password reset verification is required',
      );
    }
    const grant = await this.tokens.consume(
      hashToken(resetToken),
      AuthTokenType.PASSWORD_RESET_VERIFIED,
    );
    if (!grant) {
      throw new UnauthorizedException(
        'Password reset verification has expired',
      );
    }

    await this.users.updatePassword(
      grant.userId,
      await this.passwords.hash(dto.newPassword),
    );
    await this.sessions.revokeAll(grant.userId, 'PASSWORD_RESET');
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findById(userId);
    if (
      !user ||
      !(await this.passwords.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (await this.passwords.compare(dto.newPassword, user.passwordHash)) {
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    await this.users.updatePassword(
      userId,
      await this.passwords.hash(dto.newPassword),
    );
    await this.sessions.revokeAll(userId, 'PASSWORD_CHANGED');
    return { message: 'Password changed successfully. Please sign in again.' };
  }

  /** Bound to the user so a code is only valid for the account it was issued to. */
  private hashCode(userId: string, code: string): string {
    return hashToken(`${userId}:${code}`);
  }
}
