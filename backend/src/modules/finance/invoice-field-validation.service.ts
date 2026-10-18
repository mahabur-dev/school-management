import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFieldType, FeatureKey } from '../../prisma';
import { FeaturesService } from '../features/features.service';

type FinanceFieldScope = 'invoice' | 'payment';

/** Validates scoped finance metadata while accounting values stay DTO/server controlled. */
@Injectable()
export class InvoiceFieldValidationService {
  constructor(private readonly features: FeaturesService) {}

  validate(
    schoolId: string,
    extraData: Record<string, unknown>,
    standardValues: Record<string, unknown> = {},
  ) {
    return this.validateScope(schoolId, 'invoice', extraData, standardValues);
  }

  validatePayment(
    schoolId: string,
    extraData: Record<string, unknown>,
    standardValues: Record<string, unknown> = {},
  ) {
    return this.validateScope(schoolId, 'payment', extraData, standardValues);
  }

  private async validateScope(
    schoolId: string,
    scope: FinanceFieldScope,
    extraData: Record<string, unknown>,
    standardValues: Record<string, unknown>,
  ) {
    const fields = await this.features.getFieldConfigurationForSchool(
      schoolId,
      FeatureKey.FEE_MANAGEMENT,
    );
    const scopedFields = fields.filter((field) =>
      field.key.startsWith(`${scope}_`),
    );
    const configured = new Map(scopedFields.map((field) => [field.key, field]));
    for (const [key, value] of Object.entries(extraData)) {
      const field = configured.get(key);
      if (!field)
        throw new BadRequestException(`Unknown ${scope} field '${key}'`);
      if (Object.hasOwn(standardValues, key))
        throw new BadRequestException(
          `${field.label} must use its standard property`,
        );
      if (field.isCore)
        throw new BadRequestException(
          `Core ${scope} field '${key}' must use its standard property`,
        );
      if (!field.enabled)
        throw new BadRequestException(`${field.label} is disabled`);
      if (!matchesType(value, field.type))
        throw new BadRequestException(
          `${field.label} must be ${field.type.toLowerCase()}`,
        );
    }
    for (const field of scopedFields) {
      const value = Object.hasOwn(standardValues, field.key)
        ? standardValues[field.key]
        : extraData[field.key];
      if (!field.isCore && !field.enabled && !isEmpty(value))
        throw new BadRequestException(`${field.label} is disabled`);
      if (!field.isCore && field.enabled && field.required && isEmpty(value)) {
        throw new BadRequestException(`${field.label} is required`);
      }
    }
  }
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === '';
}
function matchesType(value: unknown, type: FeatureFieldType) {
  if (isEmpty(value)) return false;
  if (type === FeatureFieldType.TEXT || type === FeatureFieldType.SELECT)
    return typeof value === 'string';
  if (type === FeatureFieldType.NUMBER)
    return typeof value === 'number' && Number.isFinite(value);
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
