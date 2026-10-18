import { ConflictException } from '@nestjs/common';
import { PaymentMethod, PrismaService } from '../../prisma';
import { PaymentsService } from './payments.service';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';

describe('PaymentsService', () => {
  const schoolId = 'f72833a0-3544-4af8-a4f3-d00c1ad36d15';
  const actorId = '3cc0d1ce-b71f-4360-b8d4-e778b197ef43';
  const invoiceId = 'd46b3306-dac3-4e38-818f-ea3c7682ed22';
  const transaction = jest.fn();
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const fields = {
    validatePayment: jest.fn().mockResolvedValue(undefined),
  } as unknown as InvoiceFieldValidationService;
  const service = new PaymentsService(prisma, fields);
  const dto = {
    amountMinor: '5000',
    paymentMethod: PaymentMethod.CASH,
    receivedOn: '2026-10-19',
    allocations: [{ invoiceId, amountMinor: '5000' }],
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a payment when its allocations do not equal its received amount', async () => {
    transaction.mockImplementation(async (callback) =>
      callback({ payment: {} }),
    );

    await expect(
      service.record(schoolId, actorId, {
        ...dto,
        allocations: [{ invoiceId, amountMinor: '4999' }],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('allows a partial allocation that is within the outstanding balance', async () => {
    const tx = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: invoiceId,
            studentId: 'student-a',
            currency: 'BDT',
            totalMinor: 10000n,
            paymentAllocations: [{ amountMinor: 2000n }],
          },
        ]),
      },
      financeSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ paymentPrefix: 'PAY', currency: 'BDT' }),
      },
      paymentSequence: {
        upsert: jest.fn().mockResolvedValue({ nextNumber: 2 }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 'payment-a',
          amountMinor: 5000n,
          allocations: [{ invoiceId, amountMinor: 5000n }],
          reversal: null,
        }),
      },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    const payment = await service.record(schoolId, actorId, dto);

    expect(payment).toEqual(expect.objectContaining({ amountMinor: '5000' }));
    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId,
          paymentNumber: 'PAY-2026-000001',
          allocations: expect.objectContaining({
            create: [
              expect.objectContaining({ invoiceId, amountMinor: 5000n }),
            ],
          }),
        }),
      }),
    );
    const createInput = tx.payment.create.mock.calls[0][0].data;
    expect(createInput.allocations.create[0]).not.toHaveProperty('schoolId');
  });

  it('rejects an allocation that exceeds the outstanding balance', async () => {
    const tx = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: invoiceId,
            studentId: 'student-a',
            currency: 'BDT',
            totalMinor: 6000n,
            paymentAllocations: [{ amountMinor: 2000n }],
          },
        ]),
      },
    };
    transaction.mockImplementation(async (callback) => callback(tx));

    await expect(service.record(schoolId, actorId, dto)).rejects.toThrow(
      'Payment allocation exceeds the invoice outstanding balance',
    );
  });
});
