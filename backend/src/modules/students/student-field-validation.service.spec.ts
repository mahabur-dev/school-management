import { BadRequestException } from '@nestjs/common';
import { FeaturesService } from '../features/features.service';
import { StudentFieldValidationService } from './student-field-validation.service';

describe('StudentFieldValidationService', () => {
  const features = {
    getFieldConfigurationForSchool: jest.fn(),
  } as unknown as FeaturesService;
  const service = new StudentFieldValidationService(features);
  beforeEach(() => jest.clearAllMocks());

  it('enforces required configured fields', async () => {
    jest.mocked(features.getFieldConfigurationForSchool).mockResolvedValue([
      {
        key: 'guardian_phone',
        label: 'Guardian phone',
        type: 'TEXT' as never,
        isCore: false,
        enabled: true,
        required: true,
        sortOrder: 1,
      },
    ]);
    await expect(service.validate('school-a', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects disabled and unknown values', async () => {
    jest.mocked(features.getFieldConfigurationForSchool).mockResolvedValue([
      {
        key: 'guardian_phone',
        label: 'Guardian phone',
        type: 'TEXT' as never,
        isCore: false,
        enabled: false,
        required: false,
        sortOrder: 1,
      },
    ]);
    await expect(
      service.validate('school-a', { guardian_phone: '123' }),
    ).rejects.toThrow('disabled');
    await expect(
      service.validate('school-a', { arbitrary: 'x' }),
    ).rejects.toThrow('Unknown');
  });

  it('rejects values whose type does not match the field definition', async () => {
    jest.mocked(features.getFieldConfigurationForSchool).mockResolvedValue([
      {
        key: 'date_of_birth',
        label: 'Date',
        type: 'DATE' as never,
        isCore: false,
        enabled: true,
        required: false,
        sortOrder: 1,
      },
    ]);
    await expect(
      service.validate('school-a', { date_of_birth: 'not-a-date' }),
    ).rejects.toThrow('must be date');
  });
});
