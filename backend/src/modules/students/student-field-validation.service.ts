import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFieldType, FeatureKey } from '../../prisma';
import { FeaturesService } from '../features/features.service';

@Injectable()
export class StudentFieldValidationService {
  constructor(private readonly features: FeaturesService) {}

  async validate(
    schoolId: string,
    extraData: Record<string, unknown>,
    submittedKeys: readonly string[] = Object.keys(extraData),
  ) {
    const fields = await this.features.getFieldConfigurationForSchool(
      schoolId,
      FeatureKey.STUDENT_MANAGEMENT,
    );
    const configured = new Map(fields.map((field) => [field.key, field]));
    for (const key of submittedKeys) {
      const value = extraData[key];
      const field = configured.get(key);
      if (!field)
        throw new BadRequestException(`Unknown student field '${key}'`);
      if (field.isCore)
        throw new BadRequestException(
          `Core field '${key}' must use its standard property`,
        );
      if (!field.enabled)
        throw new BadRequestException(`Student field '${key}' is disabled`);
      if (!matchesType(value, field.type))
        throw new BadRequestException(
          `Student field '${key}' must be ${field.type.toLowerCase()}`,
        );
    }
    for (const field of fields) {
      if (
        !field.isCore &&
        field.enabled &&
        field.required &&
        isEmpty(extraData[field.key])
      ) {
        throw new BadRequestException(
          `Student field '${field.key}' is required`,
        );
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
