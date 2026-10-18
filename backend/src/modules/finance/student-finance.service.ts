import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, PrismaService } from '../../prisma';
import { StudentsService } from '../students/students.service';

@Injectable()
export class StudentFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
  ) {}

  async statement(schoolId: string, studentId: string) {
    const student = await this.students.get(schoolId, studentId);
    const invoices = await this.prisma.forSchool(schoolId).invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        academicYear: true,
        issueDate: true,
        dueDate: true,
        currency: true,
        totalMinor: true,
        status: true,
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            description: true,
            quantity: true,
            lineTotalMinor: true,
            feeCategory: { select: { code: true, name: true } },
          },
        },
        paymentAllocations: {
          orderBy: { createdAt: 'desc' },
          select: {
            amountMinor: true,
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                amountMinor: true,
                currency: true,
                paymentMethod: true,
                referenceNumber: true,
                receivedOn: true,
                status: true,
                createdAt: true,
                reversal: { select: { reason: true, createdAt: true } },
              },
            },
          },
        },
      },
    });

    let totalInvoiced = 0n;
    let totalPaid = 0n;
    let overdue = 0n;
    const today = utcToday();
    const payments = new Map<
      string,
      (typeof invoices)[number]['paymentAllocations'][number]['payment'] & {
        allocatedMinor: bigint;
      }
    >();

    const invoiceHistory = invoices.map((invoice) => {
      const { paymentAllocations, ...invoiceData } = invoice;
      const paidMinor = paymentAllocations
        .filter(({ payment }) => payment.status === PaymentStatus.POSTED)
        .reduce((sum, allocation) => sum + allocation.amountMinor, 0n);
      const outstandingMinor =
        invoice.status === InvoiceStatus.ISSUED
          ? invoice.totalMinor - paidMinor
          : 0n;
      if (invoice.status === InvoiceStatus.ISSUED) {
        totalInvoiced += invoice.totalMinor;
        totalPaid += paidMinor;
        if (outstandingMinor > 0n && invoice.dueDate < today)
          overdue += outstandingMinor;
      }
      for (const allocation of paymentAllocations) {
        const existing = payments.get(allocation.payment.id);
        payments.set(allocation.payment.id, {
          ...allocation.payment,
          allocatedMinor:
            (existing?.allocatedMinor ?? 0n) + allocation.amountMinor,
        });
      }
      return {
        ...invoiceData,
        totalMinor: invoice.totalMinor.toString(),
        paidMinor: paidMinor.toString(),
        outstandingMinor: outstandingMinor.toString(),
        paymentStatus: paymentState(
          invoice.status,
          paidMinor,
          outstandingMinor,
        ),
        isOverdue:
          invoice.status === InvoiceStatus.ISSUED &&
          outstandingMinor > 0n &&
          invoice.dueDate < today,
        items: invoice.items.map((item) => ({
          ...item,
          lineTotalMinor: item.lineTotalMinor.toString(),
        })),
      };
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        className: student.className,
        rollNo: student.rollNo,
      },
      currency: invoiceHistory[0]?.currency ?? 'BDT',
      summary: {
        totalInvoicedMinor: totalInvoiced.toString(),
        totalPaidMinor: totalPaid.toString(),
        outstandingMinor: (totalInvoiced - totalPaid).toString(),
        overdueMinor: overdue.toString(),
      },
      invoices: invoiceHistory,
      payments: [...payments.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((payment) => ({
          ...payment,
          amountMinor: payment.amountMinor.toString(),
          allocatedMinor: payment.allocatedMinor.toString(),
        })),
    };
  }
}

function paymentState(
  status: InvoiceStatus,
  paidMinor: bigint,
  outstandingMinor: bigint,
) {
  if (status === InvoiceStatus.DRAFT) return 'NOT_ISSUED';
  if (status === InvoiceStatus.VOID) return 'VOID';
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
