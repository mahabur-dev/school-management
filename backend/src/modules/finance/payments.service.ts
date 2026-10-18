import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PaymentStatus, Prisma, PrismaService } from '../../prisma';
import { RecordPaymentDto } from './dto/payment.dto';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fields: InvoiceFieldValidationService,
  ) {}

  async list(schoolId: string) {
    const payments = await this.prisma.forSchool(schoolId).payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { allocations: true, reversal: true },
    });
    return payments.map(paymentResponse);
  }

  async get(schoolId: string, paymentId: string) {
    const payment = await this.prisma.forSchool(schoolId).payment.findFirst({
      where: { id: paymentId },
      include: { allocations: true, reversal: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return paymentResponse(payment);
  }

  async listForInvoice(schoolId: string, invoiceId: string) {
    const invoice = await this.prisma.forSchool(schoolId).invoice.findFirst({
      where: { id: invoiceId },
      select: { id: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const allocations = await this.prisma
      .forSchool(schoolId)
      .paymentAllocation.findMany({
        where: { invoiceId },
        orderBy: { payment: { createdAt: 'desc' } },
        include: {
          payment: { include: { allocations: true, reversal: true } },
        },
      });
    return allocations.map((allocation) => ({
      ...paymentResponse(allocation.payment),
      allocatedMinor: allocation.amountMinor.toString(),
    }));
  }

  async record(
    schoolId: string,
    actorId: string,
    dto: RecordPaymentDto,
    idempotencyKey?: string,
  ) {
    await this.fields.validatePayment(schoolId, dto.extraData ?? {}, {
      payment_reference: dto.referenceNumber,
    });
    const requestHash = idempotencyKey ? hash(dto) : undefined;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          if (idempotencyKey) {
            const existing = await tx.payment.findFirst({
              where: { schoolId, idempotencyKey },
              include: { allocations: true, reversal: true },
            });
            if (existing) {
              if (existing.requestHash !== requestHash)
                throw new ConflictException(
                  'Idempotency key was already used with different payment details',
                );
              return paymentResponse(existing);
            }
          }
          const allocationTotal = dto.allocations.reduce(
            (sum, item) => sum + BigInt(item.amountMinor),
            0n,
          );
          const amountMinor = BigInt(dto.amountMinor);
          if (allocationTotal !== amountMinor)
            throw new ConflictException(
              'Payment allocations must equal the received amount',
            );
          const invoiceIds = dto.allocations.map((item) => item.invoiceId);
          if (new Set(invoiceIds).size !== invoiceIds.length)
            throw new ConflictException(
              'An invoice can only be allocated once per payment',
            );
          const invoices = await tx.invoice.findMany({
            where: { schoolId, id: { in: invoiceIds }, status: 'ISSUED' },
            include: {
              paymentAllocations: {
                where: { payment: { status: PaymentStatus.POSTED } },
                select: { amountMinor: true },
              },
            },
          });
          if (invoices.length !== invoiceIds.length)
            throw new NotFoundException(
              'One or more issued invoices are unavailable',
            );
          if (new Set(invoices.map((invoice) => invoice.studentId)).size !== 1)
            throw new ConflictException(
              'A payment can only settle invoices for one student',
            );
          const allocations = new Map(
            dto.allocations.map((item) => [
              item.invoiceId,
              BigInt(item.amountMinor),
            ]),
          );
          if (new Set(invoices.map((invoice) => invoice.currency)).size !== 1)
            throw new ConflictException(
              'All payment allocations must use the same currency',
            );
          for (const invoice of invoices) {
            const paid = invoice.paymentAllocations.reduce(
              (sum, allocation) => sum + allocation.amountMinor,
              0n,
            );
            const requested = allocations.get(invoice.id) ?? 0n;
            if (requested > invoice.totalMinor - paid)
              throw new ConflictException(
                'Payment allocation exceeds the invoice outstanding balance',
              );
          }
          const receivedOn = date(dto.receivedOn);
          const year = receivedOn.getUTCFullYear();
          const [settings, sequence] = await Promise.all([
            tx.financeSetting.findUnique({
              where: { schoolId },
              select: { paymentPrefix: true, currency: true },
            }),
            tx.paymentSequence.upsert({
              where: { schoolId_year: { schoolId, year } },
              create: { schoolId, year, nextNumber: 2 },
              update: { nextNumber: { increment: 1 } },
              select: { nextNumber: true },
            }),
          ]);
          if (!settings)
            throw new NotFoundException('Finance settings not found');
          if (
            invoices.some((invoice) => invoice.currency !== settings.currency)
          )
            throw new ConflictException(
              'Invoice currency does not match the school finance currency',
            );
          const paymentData: Prisma.PaymentUncheckedCreateInput = {
            schoolId,
            paymentNumber: `${settings.paymentPrefix}-${year}-${String(sequence.nextNumber - 1).padStart(6, '0')}`,
            amountMinor,
            currency: settings.currency,
            paymentMethod: dto.paymentMethod,
            referenceNumber: dto.referenceNumber,
            receivedOn,
            idempotencyKey,
            requestHash,
            extraData: (dto.extraData ?? {}) as Prisma.InputJsonValue,
            recordedBy: actorId,
            allocations: {
              // Prisma supplies both paymentId and the composite-relation
              // schoolId from the parent Payment during a nested create.
              create: dto.allocations.map((item) => ({
                invoiceId: item.invoiceId,
                amountMinor: BigInt(item.amountMinor),
              })),
            },
          };
          const payment = await tx.payment.create({
            data: paymentData,
            include: { allocations: true, reversal: true },
          });
          return paymentResponse(payment);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma
          .forSchool(schoolId)
          .payment.findFirst({
            where: { idempotencyKey },
            include: { allocations: true, reversal: true },
          });
        if (existing) {
          if (existing.requestHash !== requestHash)
            throw new ConflictException(
              'Idempotency key was already used with different payment details',
            );
          return paymentResponse(existing);
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      )
        throw new ConflictException(
          'Payment conflict detected; retry the request with the same idempotency key',
        );
      throw error;
    }
  }

  async reverse(
    schoolId: string,
    paymentId: string,
    actorId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const changed = await tx.payment.updateMany({
          where: { id: paymentId, schoolId, status: PaymentStatus.POSTED },
          data: { status: PaymentStatus.REVERSED },
        });
        if (!changed.count)
          throw new ConflictException('Only posted payments can be reversed');
        await tx.paymentReversal.create({
          data: { schoolId, paymentId, reversedBy: actorId, reason },
        });
        return { paymentId, status: PaymentStatus.REVERSED };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function hash(dto: RecordPaymentDto) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(dto)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

function paymentResponse<
  T extends {
    amountMinor: bigint;
    allocations: Array<{ amountMinor: bigint }>;
  },
>(payment: T) {
  return {
    ...payment,
    amountMinor: payment.amountMinor.toString(),
    allocations: payment.allocations.map((allocation) => ({
      ...allocation,
      amountMinor: allocation.amountMinor.toString(),
    })),
  };
}
