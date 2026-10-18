import { apiRequest } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ConfiguredField,
  EnabledFeature,
  FeatureKey,
} from "@/types/feature";

export type FeatureCatalogueItem = {
  id: string;
  key: FeatureKey;
  name: string;
  description: string | null;
  _count: { fields: number };
};
export type FieldUpdate = Pick<ConfiguredField, "key" | "enabled" | "required">;

/**
 * Prisma serializes its enum values as uppercase (for example, `DATE`),
 * while the web app uses lowercase HTML-friendly field types. Keep that
 * transport detail at the API boundary so every consumer receives one shape.
 */
type ApiConfiguredField = Omit<ConfiguredField, "type"> & { type: string };

function normalizeFields(fields: ApiConfiguredField[]): ConfiguredField[] {
  return fields.map(({ type, ...field }) => ({
    ...field,
    type: type.toLowerCase() as ConfiguredField["type"],
  }));
}

export const featuresApi = {
  listCatalogue: (accessToken: string) =>
    apiRequest<FeatureCatalogueItem[]>(endpoints.superAdmin.features, {
      accessToken,
    }),
  setSchoolFeature: (
    accessToken: string,
    schoolId: string,
    key: FeatureKey,
    enabled: boolean,
  ) =>
    apiRequest<{ enabled: boolean }>(
      endpoints.superAdmin.schoolFeature(schoolId, key),
      {
        method: "PATCH",
        accessToken,
        body: { enabled },
      },
    ),
  getSchoolFeature: (accessToken: string, schoolId: string, key: FeatureKey) =>
    apiRequest<{ enabled: boolean }>(
      endpoints.superAdmin.schoolFeature(schoolId, key),
      { accessToken },
    ),
  getSchoolFields: (accessToken: string, schoolId: string, key: FeatureKey) =>
    apiRequest<ApiConfiguredField[]>(
      endpoints.superAdmin.schoolFeatureFields(schoolId, key),
      { accessToken },
    ).then(normalizeFields),
  updateSchoolFields: (
    accessToken: string,
    schoolId: string,
    key: FeatureKey,
    fields: readonly FieldUpdate[],
  ) =>
    apiRequest<ApiConfiguredField[]>(
      endpoints.superAdmin.schoolFeatureFields(schoolId, key),
      {
        method: "PATCH",
        accessToken,
        // `ConfiguredField` is used by the UI, but the write DTO deliberately
        // accepts only mutable tenant settings. Strip catalogue metadata here.
        body: {
          fields: fields.map(({ key: fieldKey, enabled, required }) => ({
            key: fieldKey,
            enabled,
            required,
          })),
        },
      },
    ).then(normalizeFields),
  mine: (accessToken: string) =>
    apiRequest<EnabledFeature[]>(endpoints.features.mine, { accessToken }),
  myStudentFields: (accessToken: string) =>
    apiRequest<ApiConfiguredField[]>(endpoints.features.studentFields, {
      accessToken,
    }).then(normalizeFields),
  myFields: (accessToken: string, key: FeatureKey) =>
    apiRequest<ApiConfiguredField[]>(endpoints.features.fields(key), {
      accessToken,
    }).then(normalizeFields),
};
