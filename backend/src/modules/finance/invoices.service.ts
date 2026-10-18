import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '../../prisma';
import { StudentsService } from '../students/students.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly students: StudentsService,
    private readonly fields: InvoiceFieldValidationService,
  ) {}

  async list(schoolId: string) {
    return (await this.repository.list(schoolId)).map(toInvoiceResponse);
  }

  async get(schoolId: string, id: string) {
    const invoice = await this.repository.find(schoolId, id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return toInvoiceResponse(invoice);
  }

  async createDraft(schoolId: string, actorId: string, dto: CreateInvoiceDto) {
    await this.students.get(schoolId, dto.studentId);
    await this.fields.validate(schoolId, dto.extraData ?? {}, {
      invoice_billing_period: dto.billingPeriod,
    });
    const resolved = await this.resolveDraft(schoolId, dto);
    const settings = await this.repository.findSettings(schoolId);
    if (!settings) throw new NotFoundException('Finance settings not found');
    try {
      const invoice = await this.repository.create(schoolId, {
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        academicYear: dto.academicYear,
        billingPeriod: optionalDate(dto.billingPeriod),
        dueDate: toDate(dto.dueDate),
        currency: settings.currency,
        createdBy: actorId,
        subtotalMinor: resolved.subtotalMinor,
        discountMinor: resolved.discountMinor,
        totalMinor: resolved.totalMinor,
        extraData: (dto.extraData ?? {}) as Prisma.InputJsonValue,
        items: { createMany: { data: resolved.items } },
      });
      return toInvoiceResponse(invoice);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async updateDraft(schoolId: string, id: string, dto: CreateInvoiceDto) {
    await this.students.get(schoolId, dto.studentId);
    await this.fields.validate(schoolId, dto.extraData ?? {}, {
      invoice_billing_period: dto.billingPeriod,
    });
    const resolved = await this.resolveDraft(schoolId, dto);
    const updated = await this.repository.replaceDraft(
      schoolId,
      id,
      {
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        academicYear: dto.academicYear,
        billingPeriod: optionalDate(dto.billingPeriod),
        dueDate: toDate(dto.dueDate),
        subtotalMinor: resolved.subtotalMinor,
        discountMinor: resolved.discountMinor,
        totalMinor: resolved.totalMinor,
        extraData: (dto.extraData ?? {}) as Prisma.InputJsonValue,
      },
      resolved.items,
    );
    if (!updated)
      throw new ConflictException('Only draft invoices can be edited');
    return toInvoiceResponse(updated);
  }

  async issue(schoolId: string, id: string) {
    const invoice = await this.get(schoolId, id);
    if (invoice.status !== InvoiceStatus.DRAFT)
      throw new ConflictException('Only draft invoices can be issued');
    const student = await this.students.get(schoolId, invoice.studentId);
    try {
      const issued = await this.repository.issue(
        schoolId,
        id,
        { name: student.name, className: student.className },
        utcToday(),
      );
      if (!issued)
        throw new NotFoundException('Invoice or finance settings not found');
      return toInvoiceResponse(issued);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVOICE_NOT_DRAFT')
        throw new ConflictException(
          'Invoice state changed; refresh and try again',
        );
      throw error;
    }
  }

  async void(schoolId: string, id: string) {
    const result = await this.repository.voidIssued(schoolId, id);
    if (!result.count)
      throw new ConflictException(
        'Only issued invoices without payments can be voided',
      );
    return this.get(schoolId, id);
  }

  private async resolveDraft(schoolId: string, dto: CreateInvoiceDto) {
    const categoryIds = dto.items.map((item) => item.feeCategoryId);
    if (new Set(categoryIds).size !== categoryIds.length)
      throw new ConflictException(
        'A fee category can only appear once in an invoice',
      );
    const categories = await this.repository.findActiveCategories(
      schoolId,
      categoryIds,
    );
    if (categories.length !== categoryIds.length)
      throw new NotFoundException('One or more fee categories are unavailable');
    if (dto.feeStructureId) {
      const structure = await this.repository.findFeeStructure(
        schoolId,
        dto.feeStructureId,
      );
      if (!structure || structure.status !== 'ACTIVE')
        throw new ConflictException(
          'The selected fee structure is unavailable',
        );
    }
    const items = dto.items.map((item) => {
      const unitAmountMinor = BigInt(item.unitAmountMinor);
      const lineTotalMinor = unitAmountMinor * BigInt(item.quantity);
      return {
        feeCategoryId: item.feeCategoryId,
        description: item.description,
        quantity: item.quantity,
        unitAmountMinor,
        lineTotalMinor,
      };
    });
    const subtotalMinor = items.reduce(
      (sum, item) => sum + item.lineTotalMinor,
      0n,
    );
    const discountMinor = BigInt(dto.discountMinor ?? '0');
    if (discountMinor > subtotalMinor)
      throw new ConflictException(
        'Discount cannot exceed the invoice subtotal',
      );
    return {
      items,
      subtotalMinor,
      discountMinor,
      totalMinor: subtotalMinor - discountMinor,
    };
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException(
        'A matching active monthly invoice already exists',
      );
    throw error;
  }
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function optionalDate(value?: string) {
  return value ? toDate(value) : null;
}
function utcToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
function toInvoiceResponse<
  T extends {
    status?: InvoiceStatus;
    dueDate?: Date;
    subtotalMinor: bigint;
    discountMinor: bigint;
    totalMinor: bigint;
    items: Array<{ unitAmountMinor: bigint; lineTotalMinor: bigint }>;
    paymentAllocations?: Array<{ amountMinor: bigint }>;
  },
>(invoice: T) {
  const { paymentAllocations = [], ...record } = invoice;
  const paidMinor = paymentAllocations.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0n,
  );
  const outstandingMinor =
    invoice.status === InvoiceStatus.ISSUED
      ? invoice.totalMinor - paidMinor
      : 0n;
  return {
    ...record,
    subtotalMinor: invoice.subtotalMinor.toString(),
    discountMinor: invoice.discountMinor.toString(),
    totalMinor: invoice.totalMinor.toString(),
    paidMinor: paidMinor.toString(),
    outstandingMinor: outstandingMinor.toString(),
    paymentStatus:
      invoice.status === InvoiceStatus.DRAFT
        ? 'NOT_ISSUED'
        : invoice.status === InvoiceStatus.VOID
          ? 'VOID'
          : outstandingMinor === 0n
            ? 'PAID'
            : paidMinor === 0n
              ? 'UNPAID'
              : 'PARTIALLY_PAID',
    isOverdue:
      invoice.status === InvoiceStatus.ISSUED &&
      outstandingMinor > 0n &&
      invoice.dueDate !== undefined &&
      invoice.dueDate < utcToday(),
    items: invoice.items.map((item) => ({
      ...item,
      unitAmountMinor: item.unitAmountMinor.toString(),
      lineTotalMinor: item.lineTotalMinor.toString(),
    })),
  };
}
