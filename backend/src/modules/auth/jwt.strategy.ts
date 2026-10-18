import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { RequestUser } from '../../common/types/request-context.type';
import { SchoolStatus, UserStatus } from '../../prisma';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthRepository } from './auth.repository';

/**
 * Verifies the signature, then re-checks server state on every request, so
 * logout, suspension and deactivation take effect immediately.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: AuthRepository,
    private readonly sessions: AuthSessionsRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const [session, user] = await Promise.all([
      this.sessions.findActiveById(payload.sessionId),
      this.users.findById(payload.sub),
    ]);

    if (
      !session ||
      !user ||
      session.userId !== user.id ||
      user.status !== UserStatus.ACTIVE ||
      !user.emailVerifiedAt ||
      user.school?.status === SchoolStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      schoolId: user.schoolId,
      role: user.role,
      sessionId: session.id,
    };
  }
}
