import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { SchoolStatus, UserRole } from '../../prisma';
import { PrismaService } from '../../prisma';
import { AuthenticatedRequest } from '../types/request-context.type';
import { TenantGuard } from './tenant.guard';

const USER = {
  id: 'u1',
  email: 'a@b.c',
  firstName: 'A',
  lastName: 'B',
  schoolId: 'school-a',
  role: UserRole.SCHOOL_ADMIN,
  sessionId: 's1',
};

function contextFor(request: Partial<AuthenticatedRequest>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(school: { id: string; status: SchoolStatus } | null) {
  const prisma = {
    school: { findUnique: jest.fn().mockResolvedValue(school) },
  } as unknown as PrismaService;
  return { guard: new TenantGuard(prisma), prisma };
}

describe('TenantGuard', () => {
  it('binds the request to the school from the token', async () => {
    const { guard } = guardWith({
      id: 'school-a',
      status: SchoolStatus.ACTIVE,
    });
    const request: Partial<AuthenticatedRequest> = { user: USER, headers: {} };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.school).toEqual({ id: 'school-a' });
  });

  it('rejects unauthenticated requests', async () => {
    const { guard } = guardWith(null);
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects accounts that belong to no school (super admin)', async () => {
    const { guard, prisma } = guardWith(null);
    const request = { user: { ...USER, schoolId: null }, headers: {} };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.school.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an x-school-id header that disagrees with the token', async () => {
    const { guard } = guardWith({
      id: 'school-a',
      status: SchoolStatus.ACTIVE,
    });
    const request = { user: USER, headers: { 'x-school-id': 'school-b' } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects suspended schools', async () => {
    const { guard } = guardWith({
      id: 'school-a',
      status: SchoolStatus.SUSPENDED,
    });
    await expect(
      guard.canActivate(contextFor({ user: USER, headers: {} })),
    ).rejects.toThrow('This school has been suspended');
  });

  it('rejects when the school no longer exists', async () => {
    const { guard } = guardWith(null);
    await expect(
      guard.canActivate(contextFor({ user: USER, headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
