import { FeatureKey, PrismaService } from '../../prisma';
import { FeaturesRepository } from './features.repository';

describe('FeaturesRepository', () => {
  it('uses the school-scoped Prisma client for school-side feature reads', async () => {
    const scoped = {
      schoolFeature: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      schoolFeatureField: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      forSchool: jest.fn().mockReturnValue(scoped),
    } as unknown as PrismaService;
    const repository = new FeaturesRepository(prisma);

    await repository.findEnabledFeatureForSchool(
      'school-a',
      FeatureKey.STUDENT_MANAGEMENT,
    );
    await repository.listEnabledFeaturesForSchool('school-a');
    await repository.listFieldConfigurationForSchool(
      'school-a',
      FeatureKey.STUDENT_MANAGEMENT,
    );

    expect(prisma.forSchool).toHaveBeenCalledTimes(3);
    expect(prisma.forSchool).toHaveBeenNthCalledWith(1, 'school-a');
    expect(scoped.schoolFeature.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          feature: { key: FeatureKey.STUDENT_MANAGEMENT },
          enabled: true,
        },
      }),
    );
    expect(scoped.schoolFeatureField.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          featureField: { feature: { key: FeatureKey.STUDENT_MANAGEMENT } },
        },
      }),
    );
  });
});
