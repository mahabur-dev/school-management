import { BadRequestException } from '@nestjs/common';
import { FeatureFieldType } from '../../prisma';
import { FeaturesService } from '../features/features.service';
import { InvoiceFieldValidationService } from './invoice-field-validation.service';

describe('InvoiceFieldValidationService', () => {
  const features = {
    getFieldConfigurationForSchool: jest.fn(),
  } as unknown as FeaturesService;
  const service = new InvoiceFieldValidationService(features);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(features.getFieldConfigurationForSchool).mockResolvedValue([
      {
        key: 'invoice_note',
        label: 'Invoice note',
        type: FeatureFieldType.TEXT,
        isCore: false,
        enabled: true,
        required: true,
        sortOrder: 1,
      },
      {
        key: 'payment_reference',
        label: 'Payment reference',
        type: FeatureFieldType.TEXT,
        isCore: false,
        enabled: false,
        required: false,
        sortOrder: 2,
      },
    ] as never);
  });

  it('requires enabled invoice metadata without requiring payment metadata', async () => {
    await expect(service.validate('school-a', {})).rejects.toThrow(
      'Invoice note is required',
    );
  });

  it('rejects payment metadata when its configured field is disabled', async () => {
    await expect(
      service.validatePayment(
        'school-a',
        {},
        {
          payment_reference: 'TXN-1',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects fields belonging to another finance scope', async () => {
    await expect(
      service.validate('school-a', {
        payment_reference: 'TXN-1',
        invoice_note: 'Monthly fee',
      }),
    ).rejects.toThrow("Unknown invoice field 'payment_reference'");
  });
});
