import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService, SchoolStatus, UserRole } from '../../prisma';
import { bootstrapFeatureConfiguration } from '../features/feature-configuration.bootstrap';
import { USER_PUBLIC_SELECT } from '../users/users.repository';

/**
 * Schools are the tenant root, so this repository is intentionally unscoped:
 * it is only reachable from super-admin flows.
 */
@Injectable()
export class SchoolsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the tenant root, first administrator, and default feature access
   * in one transaction. A failed configuration bootstrap rolls the school and
   * administrator back too, so no tenant can exist without its defaults.
   */
  createWithAdmin(input: {
    name: string;
    slug: string;
    admin: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: input.name,
          slug: input.slug,
          users: {
            create: {
              ...input.admin,
              role: UserRole.SCHOOL_ADMIN,
              mustChangePassword: false,
              // The super admin vouches for the address; no OTP on first login.
              emailVerifiedAt: new Date(),
            },
          },
        },
        include: { users: { select: USER_PUBLIC_SELECT } },
      });

      await bootstrapFeatureConfiguration(tx, [school.id]);
      return school;
    });
  }

  async findPage(input: {
    skip: number;
    take: number;
    status?: SchoolStatus;
    search?: string;
  }) {
    const where: Prisma.SchoolWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { slug: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: input.skip,
        take: input.take,
        include: { _count: { select: { users: true } } },
      }),
      this.prisma.school.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.school.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
  }

  /** Emails are unique across the whole platform, so this check is global. */
  async emailInUse(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  findBySlug(slug: string) {
    return this.prisma.school.findUnique({ where: { slug } });
  }

  /** Suspending also ends every live session of that school's users. */
  async updateStatus(id: string, status: SchoolStatus) {
    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.update({
        where: { id },
        data: { status },
      });
      if (status === SchoolStatus.SUSPENDED) {
        await tx.authSession.updateMany({
          where: { user: { schoolId: id }, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'SCHOOL_SUSPENDED' },
        });
      }
      return school;
    });
  }
}
