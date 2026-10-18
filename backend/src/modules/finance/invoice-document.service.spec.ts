import { NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '../../prisma';
import { InvoiceDocumentService } from './invoice-document.service';
import { InvoicesRepository } from './invoices.repository';

describe('InvoiceDocumentService', () => {
  const schoolId = 'f72833a0-3544-4af8-a4f3-d00c1ad36d15';
  const invoiceId = 'd46b3306-dac3-4e38-818f-ea3c7682ed22';
  const findDocument = jest.fn();
  const repository = { findDocument } as unknown as InvoicesRepository;
  const service = new InvoiceDocumentService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant-scoped PDF containing the immutable invoice values', async () => {
    findDocument.mockResolvedValue({
      id: invoiceId,
      invoiceNumber: 'INV-2026-000001',
      academicYear: '2026',
      billingPeriod: new Date('2026-10-01T00:00:00.000Z'),
      studentNameSnapshot: 'Test Student',
      classNameSnapshot: 'Class 8',
      issueDate: new Date('2026-10-18T00:00:00.000Z'),
      dueDate: new Date('2026-10-31T00:00:00.000Z'),
      currency: 'BDT',
      subtotalMinor: 300000n,
      discountMinor: 0n,
      totalMinor: 300000n,
      status: InvoiceStatus.ISSUED,
      school: { name: 'Demo School', slug: 'demo-school' },
      student: {
        id: 'student-id',
        name: 'Current Student Name',
        className: 'Class 9',
        rollNo: '12',
      },
      items: [
        {
          description: 'Monthly tuition',
          quantity: 1,
          unitAmountMinor: 300000n,
          lineTotalMinor: 300000n,
          feeCategory: { name: 'Tuition Fee', code: 'TUITION' },
        },
      ],
      paymentAllocations: [{ amountMinor: 100000n }],
    });

    const document = await service.generate(schoolId, invoiceId);

    expect(findDocument).toHaveBeenCalledWith(schoolId, invoiceId);
    expect(document.fileName).toBe('INV-2026-000001.pdf');
    expect(document.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(document.buffer.length).toBeGreaterThan(1_000);
    expect(document.buffer.toString('latin1')).toMatch(/\/Count 1\b/);
  });

  it('does not disclose a document outside the scoped school', async () => {
    findDocument.mockResolvedValue(null);

    await expect(service.generate(schoolId, invoiceId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
