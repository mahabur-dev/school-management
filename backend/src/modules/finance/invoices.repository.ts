import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  PrismaService,
} from '../../prisma';

export const INVOICE_SELECT = {
  id: true,
  studentId: true,
  feeStructureId: true,
  invoiceNumber: true,
  academicYear: true,
  billingPeriod: true,
  studentNameSnapshot: true,
  classNameSnapshot: true,
  issueDate: true,
  dueDate: true,
  currency: true,
  subtotalMinor: true,
  discountMinor: true,
  totalMinor: true,
  status: true,
  extraData: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      feeCategoryId: true,
      description: true,
      quantity: true,
      unitAmountMinor: true,
      lineTotalMinor: true,
      feeCategory: { select: { code: true, name: true } },
    },
  },
  paymentAllocations: {
    where: { payment: { status: PaymentStatus.POSTED } },
    select: { amountMinor: true },
  },
} satisfies Prisma.InvoiceSelect;
type InvoiceRecord = Prisma.InvoiceGetPayload<{
  select: typeof INVOICE_SELECT;
}>;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.forSchool(schoolId).invoice.findMany({
      orderBy: { createdAt: 'desc' },
      select: INVOICE_SELECT,
    });
  }

  find(schoolId: string, id: string) {
    return this.prisma
      .forSchool(schoolId)
      .invoice.findFirst({ where: { id }, select: INVOICE_SELECT });
  }

  findDocument(schoolId: string, id: string) {
    return this.prisma.forSchool(schoolId).invoice.findFirst({
      where: { id },
      select: {
        ...INVOICE_SELECT,
        school: { select: { name: true, slug: true } },
        student: {
          select: { id: true, name: true, className: true, rollNo: true },
        },
      },
    });
  }

  create(
    schoolId: string,
    data: Omit<Prisma.InvoiceUncheckedCreateInput, 'schoolId'> &
      Pick<Prisma.InvoiceCreateInput, 'items'>,
  ): Promise<InvoiceRecord> {
    return this.prisma
      .forSchool(schoolId)
      .invoice.create({ data: { ...data, schoolId }, select: INVOICE_SELECT });
  }

  async replaceDraft(
    schoolId: string,
    id: string,
    data: Omit<Prisma.InvoiceUncheckedUpdateInput, 'schoolId'>,
    items: Prisma.InvoiceItemCreateManyInvoiceInput[],
  ): Promise<InvoiceRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.invoice.updateMany({
        where: { id, schoolId, status: InvoiceStatus.DRAFT },
        data,
      });
      if (!changed.count) return null;
      await tx.invoiceItem.deleteMany({ where: { schoolId, invoiceId: id } });
      await tx.invoiceItem.createMany({
        data: items.map((item) => ({ ...item, schoolId, invoiceId: id })),
      });
      return tx.invoice.findFirst({
        where: { id, schoolId },
        select: INVOICE_SELECT,
      });
    });
  }

  async issue(
    schoolId: string,
    id: string,
    studentSnapshot: { name: string; className: string },
    issueDate: Date,
  ): Promise<InvoiceRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.financeSetting.findUnique({
        where: { schoolId },
        select: { invoicePrefix: true },
      });
      if (!settings) return null;
      const year = issueDate.getUTCFullYear();
      const sequence = await tx.invoiceSequence.upsert({
        where: { schoolId_year: { schoolId, year } },
        create: { schoolId, year, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
        select: { nextNumber: true },
      });
      const invoiceNumber = `${settings.invoicePrefix}-${year}-${String(sequence.nextNumber - 1).padStart(6, '0')}`;
      const changed = await tx.invoice.updateMany({
        where: { id, schoolId, status: InvoiceStatus.DRAFT },
        data: {
          status: InvoiceStatus.ISSUED,
          invoiceNumber,
          issueDate,
          studentNameSnapshot: studentSnapshot.name,
          classNameSnapshot: studentSnapshot.className,
        },
      });
      if (!changed.count) throw new Error('INVOICE_NOT_DRAFT');
      return tx.invoice.findFirst({
        where: { id, schoolId },
        select: INVOICE_SELECT,
      });
    });
  }

  voidIssued(schoolId: string, id: string) {
    return this.prisma.forSchool(schoolId).invoice.updateMany({
      where: {
        id,
        status: InvoiceStatus.ISSUED,
        paymentAllocations: {
          none: { payment: { status: PaymentStatus.POSTED } },
        },
      },
      data: { status: InvoiceStatus.VOID },
    });
  }

  findActiveCategories(schoolId: string, ids: readonly string[]) {
    return this.prisma.forSchool(schoolId).feeCategory.findMany({
      where: { id: { in: [...ids] }, isActive: true },
      select: { id: true },
    });
  }

  findFeeStructure(schoolId: string, id: string) {
    return this.prisma.forSchool(schoolId).feeStructure.findFirst({
      where: { id },
      select: { id: true, status: true },
    });
  }

  findSettings(schoolId: string) {
    return this.prisma.forSchool(schoolId).financeSetting.findFirst({
      select: { currency: true },
    });
  }
}
