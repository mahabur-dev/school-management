import { BadRequestException } from '@nestjs/common';
import { FeatureKey } from '../../prisma';

/** Stable public API values; Prisma enum identifiers remain implementation detail. */
const FEATURE_KEYS: Record<string, FeatureKey> = {
  student_management: FeatureKey.STUDENT_MANAGEMENT,
  fee_management: FeatureKey.FEE_MANAGEMENT,
};

/** Feature dependencies are evaluated by FeaturesService before state changes. */
const FEATURE_DEPENDENCIES: ReadonlyMap<FeatureKey, readonly FeatureKey[]> =
  new Map([[FeatureKey.FEE_MANAGEMENT, [FeatureKey.STUDENT_MANAGEMENT]]]);

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

export function getFeatureDependencies(key: FeatureKey): readonly FeatureKey[] {
  return FEATURE_DEPENDENCIES.get(key) ?? [];
}

export function getFeatureDependents(key: FeatureKey): readonly FeatureKey[] {
  return [...FEATURE_DEPENDENCIES.entries()]
    .filter(([, dependencies]) => dependencies.includes(key))
    .map(([dependent]) => dependent);
}
