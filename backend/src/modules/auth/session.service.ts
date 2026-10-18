import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  generateOpaqueToken,
  hashToken,
} from '../../common/helpers/token.helper';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { SessionMetadata } from '../../common/types/session-metadata.type';
import { SchoolStatus, UserStatus } from '../../prisma';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthRepository } from './auth.repository';

type SessionSubject = {
  id: string;
  email: string;
  schoolId: string | null;
  role: JwtPayload['role'];
};

/** Issues access/refresh token pairs and rotates refresh tokens. */
@Injectable()
export class SessionService {
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;
  private readonly rememberMeExpiresIn: number;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly sessions: AuthSessionsRepository,
    private readonly users: AuthRepository,
  ) {
    this.accessExpiresIn = config.getOrThrow<number>('jwt.accessExpiresIn');
    this.refreshExpiresIn = config.getOrThrow<number>('auth.refreshExpiresIn');
    this.rememberMeExpiresIn = config.getOrThrow<number>(
      'auth.rememberMeRefreshExpiresIn',
    );
  }

  async issue(
    user: SessionSubject,
    rememberMe: boolean,
    metadata: SessionMetadata,
    familyId: string = randomUUID(),
  ) {
    const refreshToken = generateOpaqueToken();
    const refreshTtl = rememberMe
      ? this.rememberMeExpiresIn
      : this.refreshExpiresIn;

    const session = await this.sessions.create({
      userId: user.id,
      familyId,
      refreshTokenHash: hashToken(refreshToken),
      rememberMe,
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
      metadata,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      schoolId: user.schoolId,
      role: user.role,
      sessionId: session.id,
      tokenType: 'access',
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      accessTokenExpiresIn: this.accessExpiresIn,
      refreshTokenExpiresAt: session.expiresAt,
    };
  }

  /**
   * One-time-use refresh tokens. Presenting an already used token means it was
   * probably stolen, so the whole token family is revoked.
   */
  async rotate(refreshToken: string, metadata: SessionMetadata) {
    const session = await this.sessions.findByRefreshTokenHash(
      hashToken(refreshToken),
    );
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    if (session.revokedAt) {
      await this.sessions.revokeFamily(session.familyId, 'REFRESH_TOKEN_REUSE');
      throw new UnauthorizedException('Refresh token has already been used');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.revoke(session.id, 'EXPIRED');
      throw new UnauthorizedException('Refresh token has expired');
    }
    if (!(await this.sessions.revoke(session.id, 'ROTATED'))) {
      // Lost a race with a concurrent refresh of the same token.
      await this.sessions.revokeFamily(session.familyId, 'REFRESH_TOKEN_REUSE');
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const user = await this.users.findById(session.userId);
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.emailVerifiedAt ||
      user.school?.status === SchoolStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('Account is unavailable');
    }

    return this.issue(user, session.rememberMe, metadata, session.familyId);
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId, 'LOGOUT');
  }

  async revokeAll(userId: string, reason = 'LOGOUT_ALL'): Promise<void> {
    await this.sessions.revokeAllForUser(userId, reason);
  }
}
