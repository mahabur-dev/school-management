import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
      contactEmail: null,
      phoneNumber: null,
      websiteUrl: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      stateOrProvince: null,
      postalCode: null,
      country: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

function setup(user: AuthUser | null, passwordMatches = true) {
  const users = {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    findActiveSchoolsByNameOrSlug: jest.fn().mockResolvedValue([]),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockImplementation(
      (_id: string, changes: Partial<AuthUser>) =>
        Promise.resolve({ ...user!, ...changes }),
    ),
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

    const result = await service.login(
      { ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' },
      {},
    );

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

    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' }, {}),
    ).rejects.toThrow('Invalid email or password');
    expect(passwords.burn).toHaveBeenCalledWith(dto.password);
  });

  it('rejects a wrong password with the same message', async () => {
    const { service, sessions } = setup(makeUser(), false);

    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' }, {}),
    ).rejects.toThrow('Invalid email or password');
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user as invalid credentials', async () => {
    const { service } = setup(makeUser({ status: UserStatus.SUSPENDED }));
    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires a verified email', async () => {
    const { service } = setup(makeUser({ emailVerifiedAt: null }));
    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks users of a suspended school', async () => {
    const user = makeUser();
    user.school = { ...user.school!, status: SchoolStatus.SUSPENDED };
    const { service, sessions } = setup(user);

    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('lets a super admin (no school) log in', async () => {
    const { service } = setup(
      makeUser({ schoolId: null, school: null, role: UserRole.SUPER_ADMIN }),
    );
    const result = await service.login({ ...dto, portal: 'PLATFORM' }, {});
    expect(result.user.schoolId).toBeNull();
  });

  it('rejects a school admin on the platform portal', async () => {
    const { service, sessions } = setup(makeUser());
    await expect(
      service.login({ ...dto, portal: 'PLATFORM' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('rejects credentials from a different school tenant', async () => {
    const { service, sessions } = setup(makeUser());
    await expect(
      service.login({ ...dto, portal: 'SCHOOL', tenantSlug: 'school-b' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('rejects a school portal login with no tenant context', async () => {
    const { service, sessions } = setup(makeUser());
    await expect(
      service.login({ ...dto, portal: 'SCHOOL' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('accepts credentials for the matching school tenant', async () => {
    const { service } = setup(makeUser());
    const result = await service.login(
      { ...dto, portal: 'SCHOOL', tenantSlug: 'school-a' },
      {},
    );
    expect(result.user.school?.slug).toBe('school-a');
  });
});

describe('AuthService.resolveTenant', () => {
  it('returns the public-safe identity of an active school', async () => {
    const { service, users } = setup(null);
    users.findActiveSchoolsByNameOrSlug.mockResolvedValue([
      {
        id: 'school-a',
        name: 'School A',
        slug: 'school-a',
      },
    ]);

    await expect(service.resolveTenant({ query: 'School A' })).resolves.toEqual(
      {
        id: 'school-a',
        name: 'School A',
        slug: 'school-a',
      },
    );
  });

  it('does not resolve an unknown or unavailable school', async () => {
    const { service } = setup(null);
    await expect(
      service.resolveTenant({ query: 'Missing School' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires a unique workspace ID when the school name is ambiguous', async () => {
    const { service, users } = setup(null);
    users.findActiveSchoolsByNameOrSlug.mockResolvedValue([
      { id: 'school-a', name: 'School A', slug: 'school-a' },
      { id: 'school-b', name: 'School A', slug: 'school-b' },
    ]);

    await expect(
      service.resolveTenant({ query: 'School A' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService.updateProfile', () => {
  it('updates editable identity fields and returns a public user', async () => {
    const { service, users } = setup(makeUser());

    const result = await service.updateProfile('u1', {
      firstName: 'Updated',
      phoneNumber: '+880 1700 000000',
    });

    expect(users.updateProfile).toHaveBeenCalledWith('u1', {
      firstName: 'Updated',
      phoneNumber: '+880 1700 000000',
    });
    expect(result).toMatchObject({
      firstName: 'Updated',
      phoneNumber: '+880 1700 000000',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an update when the user no longer exists', async () => {
    const { service } = setup(null);

    await expect(
      service.updateProfile('missing', { firstName: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
