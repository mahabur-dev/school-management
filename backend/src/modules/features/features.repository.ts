import { Injectable } from '@nestjs/common';
import { FeatureKey, PrismaService } from '../../prisma';

/**
 * The only data-access layer for feature catalogue and tenant configuration.
 * Super-admin methods intentionally use the unscoped client; school methods
 * always acquire a client locked to the requested school.
 */
@Injectable()
export class FeaturesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCatalogue() {
    return this.prisma.feature.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        _count: { select: { fields: true } },
      },
    });
  }

  findFeatureByKey(key: FeatureKey) {
    return this.prisma.feature.findUnique({ where: { key } });
  }

  findSchoolFeature(schoolId: string, key: FeatureKey) {
    return this.prisma.schoolFeature.findFirst({
      where: { schoolId, feature: { key } },
      select: { id: true, enabled: true, featureId: true },
    });
  }

  upsertSchoolFeature(schoolId: string, featureId: string, enabled: boolean) {
    return this.prisma.schoolFeature.upsert({
      where: { schoolId_featureId: { schoolId, featureId } },
      update: { enabled },
      create: { schoolId, featureId, enabled },
      select: { enabled: true },
    });
  }

  listFeatureFields(key: FeatureKey) {
    return this.prisma.featureField.findMany({
      where: { feature: { key } },
      select: { id: true, key: true, isCore: true },
    });
  }

  updateSchoolFieldSettings(
    schoolId: string,
    updates: Array<{
      featureFieldId: string;
      enabled: boolean;
      required: boolean;
    }>,
  ) {
    return this.prisma.$transaction((tx) =>
      Promise.all(
        updates.map((update) =>
          tx.schoolFeatureField.upsert({
            where: {
              schoolId_featureFieldId: {
                schoolId,
                featureFieldId: update.featureFieldId,
              },
            },
            update: { enabled: update.enabled, required: update.required },
            create: { schoolId, ...update },
          }),
        ),
      ),
    );
  }

  listSchoolFieldConfiguration(schoolId: string, key: FeatureKey) {
    return this.prisma.schoolFeatureField.findMany({
      where: { schoolId, featureField: { feature: { key } } },
      orderBy: { featureField: { sortOrder: 'asc' } },
      select: {
        enabled: true,
        required: true,
        featureField: {
          select: {
            key: true,
            label: true,
            type: true,
            isCore: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  findEnabledFeatureForSchool(schoolId: string, key: FeatureKey) {
    return this.prisma.forSchool(schoolId).schoolFeature.findFirst({
      where: { feature: { key }, enabled: true },
      select: { featureId: true },
    });
  }

  listEnabledFeaturesForSchool(schoolId: string) {
    return this.prisma.forSchool(schoolId).schoolFeature.findMany({
      where: { enabled: true },
      orderBy: { feature: { name: 'asc' } },
      select: {
        feature: { select: { key: true, name: true } },
      },
    });
  }

  listFieldConfigurationForSchool(schoolId: string, key: FeatureKey) {
    return this.prisma.forSchool(schoolId).schoolFeatureField.findMany({
      where: { featureField: { feature: { key } } },
      orderBy: { featureField: { sortOrder: 'asc' } },
      select: {
        enabled: true,
        required: true,
        featureField: {
          select: {
            key: true,
            label: true,
            type: true,
            isCore: true,
            sortOrder: true,
          },
        },
      },
    });
  }
}
