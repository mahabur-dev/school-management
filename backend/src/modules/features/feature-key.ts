import { BadRequestException } from '@nestjs/common';
import { FeatureKey } from '../../prisma';

/** Stable public API values; Prisma enum identifiers remain implementation detail. */
const FEATURE_KEYS: Record<string, FeatureKey> = {
  student_management: FeatureKey.STUDENT_MANAGEMENT,
};

export function parseFeatureKey(value: string): FeatureKey {
  const key = FEATURE_KEYS[value];
  if (!key) throw new BadRequestException('Unsupported feature key');
  return key;
}

export function toFeatureKeyValue(key: FeatureKey): string {
  return (
    Object.entries(FEATURE_KEYS).find(([, value]) => value === key)?.[0] ?? key
  );
}
