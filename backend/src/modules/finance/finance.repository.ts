import { Injectable } from '@nestjs/common';
import { FeeStructureStatus, Prisma, PrismaService } from '../../prisma';

export const FEE_CATEGORY_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeeCategorySelect;

export const FEE_STRUCTURE_SELECT = {
  id: true,
  name: true,
  className: true,
  academicYear: true,
  billingFrequency: true,
  effectiveFrom: true,
  effectiveUntil: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      feeCategoryId: true,
      description: true,
      amountMinor: true,
      feeCategory: { select: { code: true, name: true } },
    },
  },
} satisfies Prisma.FeeStructureSelect;

type FeeStructureRecord = Prisma.FeeStructureGetPayload<{
  select: typeof FEE_STRUCTURE_SELECT;
}>;

@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(schoolId: string) {
    return this.prisma.forSchool(schoolId).feeCategory.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: FEE_CATEGORY_SELECT,
    });
  }

  findCategory(schoolId: string, id: string) {
    return this.prisma
      .forSchool(schoolId)
      .feeCategory.findFirst({ where: { id }, select: FEE_CATEGORY_SELECT });
  }

  createCategory(
    schoolId: string,
    data: Omit<Prisma.FeeCategoryUncheckedCreateInput, 'schoolId'>,
  ) {
    return this.prisma.forSchool(schoolId).feeCategory.create({
      data: { ...data, schoolId },
      select: FEE_CATEGORY_SELECT,
    });
  }

  updateCategory(
    schoolId: string,
    id: string,
    data: Prisma.FeeCategoryUpdateManyMutationInput,
  ) {
    return this.prisma
      .forSchool(schoolId)
      .feeCategory.updateMany({ where: { id }, data });
  }

  listStructures(schoolId: string) {
    return this.prisma.forSchool(schoolId).feeStructure.findMany({
      orderBy: [
        { status: 'asc' },
        { className: 'asc' },
        { effectiveFrom: 'desc' },
      ],
      select: FEE_STRUCTURE_SELECT,
    });
  }

  findStructure(schoolId: string, id: string) {
    return this.prisma
      .forSchool(schoolId)
      .feeStructure.findFirst({ where: { id }, select: FEE_STRUCTURE_SELECT });
  }

  async createStructure(
    schoolId: string,
    data: Omit<Prisma.FeeStructureUncheckedCreateInput, 'schoolId'> &
      Pick<Prisma.FeeStructureCreateInput, 'items'>,
  ): Promise<FeeStructureRecord> {
    return this.prisma.forSchool(schoolId).feeStructure.create({
      data: { ...data, schoolId },
      select: FEE_STRUCTURE_SELECT,
    });
  }

  async replaceDraftStructure(
    schoolId: string,
    id: string,
    data: Omit<Prisma.FeeStructureUpdateInput, 'items'>,
    items: Prisma.FeeStructureItemCreateManyFeeStructureInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.feeStructure.updateMany({
        where: { id, schoolId, status: FeeStructureStatus.DRAFT },
        data,
      });
      if (!result.count) return null;
      await tx.feeStructureItem.deleteMany({
        where: { schoolId, feeStructureId: id },
      });
      await tx.feeStructureItem.createMany({
        data: items.map((item) => ({ ...item, schoolId, feeStructureId: id })),
      });
      return tx.feeStructure.findFirst({
        where: { id, schoolId },
        select: FEE_STRUCTURE_SELECT,
      });
    });
  }

  transitionStructure(
    schoolId: string,
    id: string,
    from: FeeStructureStatus,
    to: FeeStructureStatus,
  ) {
    return this.prisma.forSchool(schoolId).feeStructure.updateMany({
      where: { id, status: from },
      data: { status: to },
    });
  }

  findActiveCategories(schoolId: string, ids: readonly string[]) {
    return this.prisma.forSchool(schoolId).feeCategory.findMany({
      where: { id: { in: [...ids] }, isActive: true },
      select: { id: true },
    });
  }
}
