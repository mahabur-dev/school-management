import { ConflictException, NotFoundException } from '@nestjs/common';
import { FeeBillingFrequency, FeeStructureStatus } from '../../prisma';
import { FinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const repository = {
    findActiveCategories: jest.fn(),
    findStructure: jest.fn(),
    createStructure: jest.fn(),
    replaceDraftStructure: jest.fn(),
    transitionStructure: jest.fn(),
  } as unknown as FinanceRepository;
  const service = new FinanceService(repository);
  const dto = {
    name: 'Class Eight Monthly 2026',
    className: 'Eight',
    academicYear: '2026',
    billingFrequency: FeeBillingFrequency.MONTHLY,
    effectiveFrom: '2026-01-01',
    items: [
      {
        feeCategoryId: '8bfb5d11-e0e4-4d48-a172-ffabd0d51311',
        amountMinor: '300000',
      },
    ],
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a structure item category that is unavailable to this school', async () => {
    jest.mocked(repository.findActiveCategories).mockResolvedValue([]);
    await expect(service.createStructure('school-a', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects duplicated categories before attempting a database write', async () => {
    await expect(
      service.createStructure('school-a', {
        ...dto,
        items: [...dto.items, { ...dto.items[0], amountMinor: '1000' }],
      }),
    ).rejects.toThrow('can only appear once');
    expect(repository.findActiveCategories).not.toHaveBeenCalled();
  });

  it('does not edit an activated structure', async () => {
    jest.mocked(repository.findStructure).mockResolvedValue({
      id: 'structure-a',
      status: FeeStructureStatus.ACTIVE,
      items: [],
    } as never);
    jest
      .mocked(repository.findActiveCategories)
      .mockResolvedValue([{ id: dto.items[0].feeCategoryId }]);
    jest.mocked(repository.replaceDraftStructure).mockResolvedValue(null);

    await expect(
      service.updateDraftStructure('school-a', 'structure-a', dto),
    ).rejects.toThrow(ConflictException);
  });

  it('activates a draft structure with items only once', async () => {
    jest
      .mocked(repository.findStructure)
      .mockResolvedValueOnce({
        id: 'structure-a',
        status: FeeStructureStatus.DRAFT,
        items: [{ amountMinor: 300000n }],
      } as never)
      .mockResolvedValueOnce({
        id: 'structure-a',
        status: FeeStructureStatus.ACTIVE,
        items: [{ amountMinor: 300000n }],
      } as never);
    jest.mocked(repository.transitionStructure).mockResolvedValue({ count: 1 });

    await expect(
      service.activateStructure('school-a', 'structure-a'),
    ).resolves.toEqual(
      expect.objectContaining({ status: FeeStructureStatus.ACTIVE }),
    );
  });
});
