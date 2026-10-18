import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SchoolStatus, UserRole, UserStatus } from '../../prisma';
import { AuthRepository, AuthUser } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const SESSION = {
  accessToken: 'access',
  refreshToken: 'refresh',
  tokenType: 'Bearer',
  accessTokenExpiresIn: 900,
  refreshTokenExpiresAt: new Date(),
};

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    schoolId: 'school-a',
    email: 'admin@a.test',
    passwordHash: 'hash',
    firstName: 'A',
    lastName: 'Admin',
    phoneNumber: null,
    role: UserRole.SCHOOL_ADMIN,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    school: {
      id: 'school-a',
      name: 'School A',
      slug: 'school-a',
      status: SchoolStatus.ACTIVE,
    },
    ...overrides,
  };
}

function setup(user: AuthUser | null, passwordMatches = true) {
  const users = {
    findByEmail: jest.fn().mockResolvedValue(user),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuthRepository>;
  const passwords = {
    compare: jest.fn().mockResolvedValue(passwordMatches),
    burn: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PasswordService>;
  const sessions = {
    issue: jest.fn().mockResolvedValue(SESSION),
  } as unknown as jest.Mocked<SessionService>;
  return {
    service: new AuthService(users, passwords, sessions),
    users,
    passwords,
    sessions,
  };
}

const dto = {
  email: 'admin@a.test',
  password: 'Secret#123',
  rememberMe: false,
};

describe('AuthService.login', () => {
  it('returns the user and tokens for valid credentials', async () => {
    const { service, sessions, users } = setup(makeUser());

    const result = await service.login(dto, {});

    expect(result.accessToken).toBe('access');
    expect(result.user).toMatchObject({
      id: 'u1',
      role: UserRole.SCHOOL_ADMIN,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(users.updateLastLogin).toHaveBeenCalledWith('u1');
    expect(sessions.issue).toHaveBeenCalledTimes(1);
  });

  it('hides whether the email exists and still spends hashing time', async () => {
    const { service, passwords } = setup(null);

    await expect(service.login(dto, {})).rejects.toThrow(
      'Invalid email or password',
    );
    expect(passwords.burn).toHaveBeenCalledWith(dto.password);
  });

  it('rejects a wrong password with the same message', async () => {
    const { service, sessions } = setup(makeUser(), false);

    await expect(service.login(dto, {})).rejects.toThrow(
      'Invalid email or password',
    );
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user as invalid credentials', async () => {
    const { service } = setup(makeUser({ status: UserStatus.SUSPENDED }));
    await expect(service.login(dto, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('requires a verified email', async () => {
    const { service } = setup(makeUser({ emailVerifiedAt: null }));
    await expect(service.login(dto, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks users of a suspended school', async () => {
    const user = makeUser();
    user.school = { ...user.school!, status: SchoolStatus.SUSPENDED };
    const { service, sessions } = setup(user);

    await expect(service.login(dto, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('lets a super admin (no school) log in', async () => {
    const { service } = setup(
      makeUser({ schoolId: null, school: null, role: UserRole.SUPER_ADMIN }),
    );
    const result = await service.login(dto, {});
    expect(result.user.schoolId).toBeNull();
  });
});
