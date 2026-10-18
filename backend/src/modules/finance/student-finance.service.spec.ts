import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaService,
} from '../../prisma';
import { StudentsService } from '../students/students.service';
import { StudentFinanceService } from './student-finance.service';

describe('StudentFinanceService', () => {
  const findMany = jest.fn();
  const prisma = {
    forSchool: jest.fn().mockReturnValue({ invoice: { findMany } }),
  } as unknown as PrismaService;
  const students = {
    get: jest.fn().mockResolvedValue({
      id: 'student-a',
      name: 'Rahim Ahmed',
      className: 'Eight',
      rollNo: '15',
    }),
  } as unknown as StudentsService;
  const service = new StudentFinanceService(prisma, students);

  beforeEach(() => jest.clearAllMocks());

  it('calculates the statement from issued invoices and posted allocations', async () => {
    findMany.mockResolvedValue([
      {
        id: 'invoice-a',
        invoiceNumber: 'INV-2026-000001',
        academicYear: '2026',
        issueDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-10'),
        currency: 'BDT',
        totalMinor: 10000n,
        status: InvoiceStatus.ISSUED,
        items: [],
        paymentAllocations: [
          {
            amountMinor: 4000n,
            payment: {
              id: 'payment-a',
              paymentNumber: 'PAY-2026-000001',
              amountMinor: 4000n,
              currency: 'BDT',
              paymentMethod: PaymentMethod.CASH,
              referenceNumber: null,
              receivedOn: new Date('2026-01-05'),
              status: PaymentStatus.POSTED,
              createdAt: new Date('2026-01-05'),
              reversal: null,
            },
          },
          {
            amountMinor: 1000n,
            payment: {
              id: 'payment-b',
              paymentNumber: 'PAY-2026-000002',
              amountMinor: 1000n,
              currency: 'BDT',
              paymentMethod: PaymentMethod.CASH,
              referenceNumber: null,
              receivedOn: new Date('2026-01-06'),
              status: PaymentStatus.REVERSED,
              createdAt: new Date('2026-01-06'),
              reversal: { reason: 'Correction', createdAt: new Date() },
            },
          },
        ],
      },
      {
        id: 'invoice-draft',
        invoiceNumber: null,
        academicYear: '2026',
        issueDate: null,
        dueDate: new Date('2026-02-01'),
        currency: 'BDT',
        totalMinor: 5000n,
        status: InvoiceStatus.DRAFT,
        items: [],
        paymentAllocations: [],
      },
    ]);

    const result = await service.statement('school-a', 'student-a');

    expect(result.summary).toEqual({
      totalInvoicedMinor: '10000',
      totalPaidMinor: '4000',
      outstandingMinor: '6000',
      overdueMinor: '6000',
    });
    expect(result.invoices[0]).toEqual(
      expect.objectContaining({
        paidMinor: '4000',
        outstandingMinor: '6000',
        paymentStatus: 'PARTIALLY_PAID',
      }),
    );
    expect(result.payments).toHaveLength(2);
    expect(students.get).toHaveBeenCalledWith('school-a', 'student-a');
  });
});
