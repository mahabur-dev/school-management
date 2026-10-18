import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureKey } from '../../prisma';
import { FeaturesService } from '../../modules/features/features.service';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { AuthenticatedRequest } from '../types/request-context.type';

/**
 * Enforces a tenant feature server-side. TenantGuard must run first because it
 * verifies the token's school and attaches `request.school`.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly features: FeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<FeatureKey>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!key) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.school) {
      throw new ForbiddenException(
        'Tenant context is required before feature access',
      );
    }
    if (!(await this.features.isEnabledForSchool(request.school.id, key))) {
      throw new ForbiddenException(
        'This feature is not enabled for this school',
      );
    }
    return true;
  }
}
