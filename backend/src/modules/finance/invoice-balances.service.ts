import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, PrismaService } from '../../prisma';

@Injectable()
export class InvoiceBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(schoolId: string, invoiceId: string) {
    const invoice = await this.prisma.forSchool(schoolId).invoice.findFirst({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        dueDate: true,
        status: true,
        totalMinor: true,
        paymentAllocations: {
          where: { payment: { status: PaymentStatus.POSTED } },
          select: { amountMinor: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const paidMinor = invoice.paymentAllocations.reduce(
      (sum, allocation) => sum + allocation.amountMinor,
      0n,
    );
    const outstandingMinor = invoice.totalMinor - paidMinor;
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      invoiceStatus: invoice.status,
      paymentStatus: paymentStatus(invoice.status, paidMinor, outstandingMinor),
      totalMinor: invoice.totalMinor.toString(),
      paidMinor: paidMinor.toString(),
      outstandingMinor: outstandingMinor.toString(),
      isOverdue:
        invoice.status === InvoiceStatus.ISSUED &&
        outstandingMinor > 0n &&
        invoice.dueDate < utcToday(),
    };
  }
}

function paymentStatus(
  invoiceStatus: InvoiceStatus,
  paidMinor: bigint,
  outstandingMinor: bigint,
) {
  if (invoiceStatus === InvoiceStatus.DRAFT) return 'NOT_ISSUED';
  if (invoiceStatus === InvoiceStatus.VOID) return 'VOID';
  if (outstandingMinor === 0n) return 'PAID';
  if (paidMinor === 0n) return 'UNPAID';
  return 'PARTIALLY_PAID';
}

function utcToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
