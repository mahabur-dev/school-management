import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';

/** The only user columns that may leave the API. Never expose passwordHash. */
export const USER_PUBLIC_SELECT = {
  id: true,
  schoolId: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  role: true,
  status: true,
  mustChangePassword: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * Tenant-scoped: every query goes through `forSchool`, so a user of another
 * school can never be read or changed from here.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPageBySchool(
    schoolId: string,
    page: { skip: number; take: number },
  ) {
    const db = this.prisma.forSchool(schoolId);
    const [items, total] = await Promise.all([
      db.user.findMany({
        select: USER_PUBLIC_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: page.skip,
        take: page.take,
      }),
      db.user.count(),
    ]);
    return { items, total };
  }

  findByIdInSchool(schoolId: string, id: string) {
    return this.prisma
      .forSchool(schoolId)
      .user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT });
  }
}
