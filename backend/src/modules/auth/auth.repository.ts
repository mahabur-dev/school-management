import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';

const AUTH_USER_INCLUDE = {
  school: { select: { id: true, name: true, slug: true, status: true } },
} satisfies Prisma.UserInclude;

/** A user row (including passwordHash) plus its school summary. Internal to auth. */
export type AuthUser = Prisma.UserGetPayload<{
  include: typeof AUTH_USER_INCLUDE;
}>;

/**
 * Credential lookups. Intentionally unscoped: at login time the school is not
 * known yet, and super admins have none. Never return these rows to clients;
 * map them with `toUserResponse`.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: AUTH_USER_INCLUDE,
    });
  }

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: AUTH_USER_INCLUDE,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });
  }
}
