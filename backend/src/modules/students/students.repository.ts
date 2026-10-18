import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';

export const STUDENT_SELECT = {
  id: true,
  name: true,
  className: true,
  rollNo: true,
  extraData: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    schoolId: string,
    input: { skip: number; take: number; search?: string; className?: string },
  ) {
    const db = this.prisma.forSchool(schoolId);
    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
      ...(input.className ? { className: input.className } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { rollNo: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.student.findMany({
        where,
        select: STUDENT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: input.skip,
        take: input.take,
      }),
      db.student.count({ where }),
    ]);
    return { items, total };
  }

  findActiveById(schoolId: string, id: string) {
    return this.prisma.forSchool(schoolId).student.findFirst({
      where: { id, deletedAt: null },
      select: STUDENT_SELECT,
    });
  }

  create(
    schoolId: string,
    data: {
      name: string;
      className: string;
      rollNo: string;
      extraData: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma
      .forSchool(schoolId)
      .student.create({ data: { ...data, schoolId }, select: STUDENT_SELECT });
  }

  async updateActive(
    schoolId: string,
    id: string,
    data: Prisma.StudentUpdateManyMutationInput,
  ) {
    const result = await this.prisma
      .forSchool(schoolId)
      .student.updateMany({ where: { id, deletedAt: null }, data });
    return result.count ? this.findActiveById(schoolId, id) : null;
  }

  async softDelete(schoolId: string, id: string) {
    const result = await this.prisma.forSchool(schoolId).student.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  }
}
