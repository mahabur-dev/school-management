import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService, SchoolStatus } from '../../prisma';

const AUTH_USER_INCLUDE = {
  school: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      contactEmail: true,
      phoneNumber: true,
      websiteUrl: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateOrProvince: true,
      postalCode: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
  },
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

  /**
   * Public-safe exact lookup for the tenant sign-in handoff. A school can be
   * found by its displayed name or unique workspace ID; at most two name
   * matches are returned so callers can reject ambiguous names safely.
   */
  async findActiveSchoolsByNameOrSlug(query: string) {
    const bySlug = await this.prisma.school.findFirst({
      where: {
        status: SchoolStatus.ACTIVE,
        slug: query.toLowerCase(),
      },
      select: { id: true, name: true, slug: true },
    });
    if (bySlug) return [bySlug];

    return this.prisma.school.findMany({
      where: {
        status: SchoolStatus.ACTIVE,
        name: { equals: query, mode: 'insensitive' },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  updateProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string | null;
    },
  ): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: AUTH_USER_INCLUDE,
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
