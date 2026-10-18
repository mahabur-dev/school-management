import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureKey } from '../../prisma';
import { FeaturesService } from '../../modules/features/features.service';
import { FeatureGuard } from './feature.guard';

describe('FeatureGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(FeatureKey.STUDENT_MANAGEMENT),
  } as unknown as Reflector;
  const features = {
    isEnabledForSchool: jest.fn(),
  } as unknown as FeaturesService;
  const guard = new FeatureGuard(reflector, features);

  function context(schoolId?: string) {
    return {
      getHandler: () => FeatureGuard,
      getClass: () => FeatureGuard,
      switchToHttp: () => ({
        getRequest: () => ({ school: schoolId ? { id: schoolId } : undefined }),
      }),
    } as never;
  }

  beforeEach(() => jest.clearAllMocks());

  it('requires TenantGuard to have established tenant context first', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(
      ForbiddenException,
    );
    expect(features.isEnabledForSchool).not.toHaveBeenCalled();
  });

  it('allows an enabled feature only for the tenant bound to the request', async () => {
    jest.mocked(features.isEnabledForSchool).mockResolvedValue(true);

    await expect(guard.canActivate(context('school-a'))).resolves.toBe(true);
    expect(features.isEnabledForSchool).toHaveBeenCalledWith(
      'school-a',
      FeatureKey.STUDENT_MANAGEMENT,
    );
  });
});
