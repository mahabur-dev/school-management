import { BadRequestException, ConflictException } from '@nestjs/common';
import { FeatureKey } from '../../prisma';
import { FeaturesRepository } from './features.repository';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  const repository = {
    listFeatureFields: jest.fn(),
    updateSchoolFieldSettings: jest.fn(),
    findFeatureByKey: jest.fn(),
    findEnabledFeaturesByKeys: jest.fn(),
    upsertSchoolFeature: jest.fn(),
  } as unknown as FeaturesRepository;
  const service = new FeaturesService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects attempts to disable a core field', async () => {
    jest
      .mocked(repository.listFeatureFields)
      .mockResolvedValue([{ id: 'field-name', key: 'name', isCore: true }]);

    await expect(
      service.updateSchoolFieldConfiguration(
        'school-a',
        FeatureKey.STUDENT_MANAGEMENT,
        [{ key: 'name', enabled: false, required: true }],
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.updateSchoolFieldSettings).not.toHaveBeenCalled();
  });

  it('rejects a disabled field marked required', async () => {
    jest
      .mocked(repository.listFeatureFields)
      .mockResolvedValue([
        { id: 'field-phone', key: 'guardian_phone', isCore: false },
      ]);

    await expect(
      service.updateSchoolFieldConfiguration(
        'school-a',
        FeatureKey.STUDENT_MANAGEMENT,
        [{ key: 'guardian_phone', enabled: false, required: true }],
      ),
    ).rejects.toThrow("Disabled field 'guardian_phone' cannot be required");
  });

  it('does not enable finance while Student Management is disabled', async () => {
    jest.mocked(repository.findFeatureByKey).mockResolvedValue({
      id: 'finance-feature',
    } as never);
    jest.mocked(repository.findEnabledFeaturesByKeys).mockResolvedValue([]);

    await expect(
      service.setSchoolFeatureEnabled(
        'school-a',
        FeatureKey.FEE_MANAGEMENT,
        true,
      ),
    ).rejects.toThrow(ConflictException);
    expect(repository.upsertSchoolFeature).not.toHaveBeenCalled();
  });

  it('does not disable Student Management while finance remains enabled', async () => {
    jest.mocked(repository.findFeatureByKey).mockResolvedValue({
      id: 'student-feature',
    } as never);
    jest.mocked(repository.findEnabledFeaturesByKeys).mockResolvedValue([
      {
        feature: {
          key: FeatureKey.FEE_MANAGEMENT,
          name: 'Fee & Invoice Management',
        },
      },
    ] as never);

    await expect(
      service.setSchoolFeatureEnabled(
        'school-a',
        FeatureKey.STUDENT_MANAGEMENT,
        false,
      ),
    ).rejects.toThrow(
      'Disable fee_management before disabling student_management',
    );
  });

  it('enables finance when Student Management is enabled', async () => {
    jest.mocked(repository.findFeatureByKey).mockResolvedValue({
      id: 'finance-feature',
    } as never);
    jest.mocked(repository.findEnabledFeaturesByKeys).mockResolvedValue([
      {
        feature: {
          key: FeatureKey.STUDENT_MANAGEMENT,
          name: 'Student Management',
        },
      },
    ] as never);
    jest.mocked(repository.upsertSchoolFeature).mockResolvedValue({
      enabled: true,
    });

    await expect(
      service.setSchoolFeatureEnabled(
        'school-a',
        FeatureKey.FEE_MANAGEMENT,
        true,
      ),
    ).resolves.toEqual({ enabled: true });
  });
});
