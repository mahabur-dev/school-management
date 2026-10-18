import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../../prisma';

export const REQUIRED_FEATURE_KEY = 'required-feature';

/** Requires a tenant feature; pair with `TenantGuard` before `FeatureGuard`. */
export const RequireFeature = (feature: FeatureKey) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
