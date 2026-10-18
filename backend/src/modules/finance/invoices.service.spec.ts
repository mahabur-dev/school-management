import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '../../prisma';
import { StudentsService } from '../students/students.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoicesService } from './invoices.service';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';

describe('InvoicesService', () => {
  const repository = {
    findActiveCategories: jest.fn(),
    findFeeStructure: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    replaceDraft: jest.fn(),
    issue: jest.fn(),
    voidIssued: jest.fn(),
    findSettings: jest.fn().mockResolvedValue({ currency: 'BDT' }),
  } as unknown as InvoicesRepository;
  const students = { get: jest.fn() } as unknown as StudentsService;
  const fields = {
    validate: jest.fn().mockResolvedValue(undefined),
  } as unknown as InvoiceFieldValidationService;
  const service = new InvoicesService(repository, students, fields);
  const dto = {
    studentId: '3e0fd422-70fd-4ce2-a0e5-a4b8719f0f0a',
    academicYear: '2026',
    dueDate: '2026-02-10',
    items: [
      {
        feeCategoryId: '4ad1dcc8-8aa7-432b-9f48-b22111a9e95a',
        description: 'Tuition',
        quantity: 1,
        unitAmountMinor: '300000',
      },
    ],
  };

  beforeEach(() => jest.clearAllMocks());

  it('calculates amounts server-side rather than accepting a client total', async () => {
    jest.mocked(students.get).mockResolvedValue({ id: dto.studentId } as never);
    jest
      .mocked(repository.findActiveCategories)
      .mockResolvedValue([{ id: dto.items[0].feeCategoryId }]);
    jest.mocked(repository.create).mockResolvedValue({
      subtotalMinor: 300000n,
      discountMinor: 0n,
      totalMinor: 300000n,
      items: [{ unitAmountMinor: 300000n, lineTotalMinor: 300000n }],
    } as never);

    await service.createDraft('school-a', 'user-a', dto);
    expect(repository.create).toHaveBeenCalledWith(
      'school-a',
      expect.objectContaining({ subtotalMinor: 300000n, totalMinor: 300000n }),
    );
  });

  it('rejects a discount greater than the calculated subtotal', async () => {
    jest.mocked(students.get).mockResolvedValue({ id: dto.studentId } as never);
    jest
      .mocked(repository.findActiveCategories)
      .mockResolvedValue([{ id: dto.items[0].feeCategoryId }]);
    await expect(
      service.createDraft('school-a', 'user-a', {
        ...dto,
        discountMinor: '300001',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not issue a non-draft invoice', async () => {
    jest.mocked(repository.find).mockResolvedValue({
      status: InvoiceStatus.ISSUED,
      subtotalMinor: 1n,
      discountMinor: 0n,
      totalMinor: 1n,
      items: [],
    } as never);
    await expect(service.issue('school-a', 'invoice-a')).rejects.toThrow(
      'Only draft invoices can be issued',
    );
    expect(repository.issue).not.toHaveBeenCalled();
  });

  it('returns not found when a tenant cannot access the invoice', async () => {
    jest.mocked(repository.find).mockResolvedValue(null);
    await expect(service.get('school-b', 'invoice-a')).rejects.toThrow(
      NotFoundException,
    );
  });
});
