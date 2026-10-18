import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashToken } from '../../common/helpers/token.helper';
import { SchoolStatus, UserRole, UserStatus } from '../../prisma';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthRepository } from './auth.repository';
import { SessionService } from './session.service';

const CONFIG: Record<string, number> = {
  'jwt.accessExpiresIn': 900,
  'auth.refreshExpiresIn': 604800,
  'auth.rememberMeRefreshExpiresIn': 2592000,
};

function setup() {
  const sessions = {
    create: jest.fn().mockImplementation(async (input) => ({
      id: 'new-session',
      expiresAt: input.expiresAt,
    })),
    findByRefreshTokenHash: jest.fn(),
    revoke: jest.fn().mockResolvedValue(true),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuthSessionsRepository>;
  const users = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt'),
  } as unknown as jest.Mocked<JwtService>;
  const config = {
    getOrThrow: (key: string) => CONFIG[key],
  } as unknown as ConfigService;
  return {
    service: new SessionService(config, jwt, sessions, users),
    sessions,
    users,
    jwt,
  };
}

const storedSession = (overrides = {}) => ({
  id: 'old-session',
  userId: 'u1',
  familyId: 'family-1',
  rememberMe: false,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
});

const activeUser = {
  id: 'u1',
  email: 'a@b.c',
  schoolId: 'school-a',
  role: UserRole.SCHOOL_ADMIN,
  status: UserStatus.ACTIVE,
  emailVerifiedAt: new Date(),
  school: { status: SchoolStatus.ACTIVE },
};

describe('SessionService.issue', () => {
  it('stores only the hash of the refresh token and signs the claims', async () => {
    const { service, sessions, jwt } = setup();

    const result = await service.issue(
      {
        id: 'u1',
        email: 'a@b.c',
        schoolId: 'school-a',
        role: UserRole.SCHOOL_ADMIN,
      },
      false,
      {},
    );

    const stored = sessions.create.mock.calls[0][0];
    expect(stored.refreshTokenHash).toBe(hashToken(result.refreshToken));
    expect(stored.refreshTokenHash).not.toBe(result.refreshToken);
    expect(jwt.signAsync.mock.calls[0][0]).toMatchObject({
      sub: 'u1',
      schoolId: 'school-a',
      role: UserRole.SCHOOL_ADMIN,
      sessionId: 'new-session',
      tokenType: 'access',
    });
  });

  it('uses the longer lifetime for remember-me sessions', async () => {
    const { service, sessions } = setup();
    const subject = {
      id: 'u1',
      email: 'a@b.c',
      schoolId: null,
      role: UserRole.SUPER_ADMIN,
    };

    await service.issue(subject, false, {});
    await service.issue(subject, true, {});

    const short = sessions.create.mock.calls[0][0].expiresAt.getTime();
    const long = sessions.create.mock.calls[1][0].expiresAt.getTime();
    expect(long).toBeGreaterThan(short);
  });
});

describe('SessionService.rotate', () => {
  it('rotates a valid token within the same family', async () => {
    const { service, sessions, users } = setup();
    sessions.findByRefreshTokenHash.mockResolvedValue(storedSession() as never);
    users.findById.mockResolvedValue(activeUser as never);

    const result = await service.rotate('token', {});

    expect(sessions.revoke).toHaveBeenCalledWith('old-session', 'ROTATED');
    expect(sessions.create.mock.calls[0][0].familyId).toBe('family-1');
    expect(result.accessToken).toBe('signed.jwt');
  });

  it('revokes the whole family when a used token is replayed', async () => {
    const { service, sessions } = setup();
    sessions.findByRefreshTokenHash.mockResolvedValue(
      storedSession({ revokedAt: new Date() }) as never,
    );

    await expect(service.rotate('token', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'REFRESH_TOKEN_REUSE',
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('revokes the family when it loses a concurrent refresh race', async () => {
    const { service, sessions } = setup();
    sessions.findByRefreshTokenHash.mockResolvedValue(storedSession() as never);
    sessions.revoke.mockResolvedValue(false);

    await expect(service.rotate('token', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      'REFRESH_TOKEN_REUSE',
    );
  });

  it('rejects unknown and expired tokens', async () => {
    const { service, sessions } = setup();

    sessions.findByRefreshTokenHash.mockResolvedValue(null);
    await expect(service.rotate('x', {})).rejects.toThrow(
      'Invalid refresh token',
    );

    sessions.findByRefreshTokenHash.mockResolvedValue(
      storedSession({ expiresAt: new Date(Date.now() - 1000) }) as never,
    );
    await expect(service.rotate('x', {})).rejects.toThrow('expired');
  });

  it('refuses to refresh for a suspended school', async () => {
    const { service, sessions, users } = setup();
    sessions.findByRefreshTokenHash.mockResolvedValue(storedSession() as never);
    users.findById.mockResolvedValue({
      ...activeUser,
      school: { status: SchoolStatus.SUSPENDED },
    } as never);

    await expect(service.rotate('token', {})).rejects.toThrow(
      'Account is unavailable',
    );
  });
});
