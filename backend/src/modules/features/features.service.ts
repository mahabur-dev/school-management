import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeatureKey } from '../../prisma';
import { FeaturesRepository } from './features.repository';
import { toFeatureKeyValue } from './feature-key';
import { UpdateSchoolFeatureFieldDto } from './dto/update-school-feature-fields.dto';

@Injectable()
export class FeaturesService {
  constructor(private readonly repository: FeaturesRepository) {}

  listCatalogue() {
    return this.repository
      .listCatalogue()
      .then((features) =>
        features.map(({ key, ...feature }) => ({
          ...feature,
          key: toFeatureKeyValue(key),
        })),
      );
  }

  async ensureFeatureExists(key: FeatureKey) {
    const feature = await this.repository.findFeatureByKey(key);
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  /** Used by FeatureGuard after TenantGuard has established the school id. */
  async isEnabledForSchool(
    schoolId: string,
    key: FeatureKey,
  ): Promise<boolean> {
    return (
      (await this.repository.findEnabledFeatureForSchool(schoolId, key)) !==
      null
    );
  }

  async getEnabledForSchool(schoolId: string) {
    const rows = await this.repository.listEnabledFeaturesForSchool(schoolId);
    return rows.map(({ feature }) => ({
      ...feature,
      key: toFeatureKeyValue(feature.key),
    }));
  }

  async getFieldConfigurationForSchool(schoolId: string, key: FeatureKey) {
    await this.ensureFeatureExists(key);
    const fields = await this.repository.listFieldConfigurationForSchool(
      schoolId,
      key,
    );
    return fields.map(({ featureField, ...settings }) => ({
      ...featureField,
      ...settings,
    }));
  }

  /** Super-admin read model; deliberately unscoped. */
  async getSchoolFieldConfiguration(schoolId: string, key: FeatureKey) {
    await this.ensureFeatureExists(key);
    const fields = await this.repository.listSchoolFieldConfiguration(
      schoolId,
      key,
    );
    return fields.map(({ featureField, ...settings }) => ({
      ...featureField,
      ...settings,
    }));
  }

  async setSchoolFeatureEnabled(
    schoolId: string,
    key: FeatureKey,
    enabled: boolean,
  ) {
    const feature = await this.ensureFeatureExists(key);
    return this.repository.upsertSchoolFeature(schoolId, feature.id, enabled);
  }

  async updateSchoolFieldConfiguration(
    schoolId: string,
    key: FeatureKey,
    updates: UpdateSchoolFeatureFieldDto[],
  ) {
    const fields = await this.repository.listFeatureFields(key);
    const byKey = new Map(fields.map((field) => [field.key, field]));
    const seen = new Set<string>();
    const resolved = updates.map((update) => {
      if (seen.has(update.key))
        throw new BadRequestException(`Field '${update.key}' is repeated`);
      seen.add(update.key);
      const field = byKey.get(update.key);
      if (!field)
        throw new BadRequestException(`Unknown field '${update.key}'`);
      if (field.isCore && (!update.enabled || !update.required)) {
        throw new BadRequestException(
          `Core field '${update.key}' must remain enabled and required`,
        );
      }
      if (!update.enabled && update.required) {
        throw new BadRequestException(
          `Disabled field '${update.key}' cannot be required`,
        );
      }
      return {
        featureFieldId: field.id,
        enabled: update.enabled,
        required: update.required,
      };
    });
    await this.repository.updateSchoolFieldSettings(schoolId, resolved);
    return this.getSchoolFieldConfiguration(schoolId, key);
  }
}
