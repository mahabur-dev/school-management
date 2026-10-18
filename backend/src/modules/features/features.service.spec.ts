import { BadRequestException } from '@nestjs/common';
import { FeatureKey } from '../../prisma';
import { FeaturesRepository } from './features.repository';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  const repository = {
    listFeatureFields: jest.fn(),
    updateSchoolFieldSettings: jest.fn(),
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
});
