import { FeatureFieldType, FeatureKey, Prisma } from '../../prisma';

/**
 * Developer-owned defaults for the first tenant feature.
 *
 * These keys form the contract between the future student DTO, persisted
 * `extraData`, and the dynamic form. Do not rename a key after data exists;
 * add a migration path instead.
 */
export const STUDENT_MANAGEMENT_FIELDS = [
  {
    key: 'name',
    label: 'Student name',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 10,
  },
  {
    key: 'class_name',
    label: 'Class',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 20,
  },
  {
    key: 'roll_no',
    label: 'Roll number',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 30,
  },
  {
    key: 'guardian_phone',
    label: 'Guardian phone',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 40,
  },
  {
    key: 'date_of_birth',
    label: 'Date of birth',
    type: FeatureFieldType.DATE,
    isCore: false,
    sortOrder: 50,
  },
  {
    key: 'address',
    label: 'Address',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 60,
  },
] as const;

type FeatureConfigurationTransaction = Prisma.TransactionClient;

export type FeatureConfigurationBootstrapResult = {
  featureId: string;
  fieldCount: number;
  configuredSchoolCount: number;
};

/**
 * Makes the developer-owned catalogue and every school's default access rows
 * consistent. It is deliberately idempotent: catalogue metadata is kept in
 * sync while an administrator's existing enabled/required choices are never
 * overwritten.
 *
 * Call this inside the caller's transaction. The seed uses it to backfill all
 * existing schools; school registration will reuse it in Step 3 for one new
 * school.
 */
export async function bootstrapFeatureConfiguration(
  tx: FeatureConfigurationTransaction,
  schoolIds?: readonly string[],
): Promise<FeatureConfigurationBootstrapResult> {
  const feature = await tx.feature.upsert({
    where: { key: FeatureKey.STUDENT_MANAGEMENT },
    update: {
      name: 'Student Management',
      description: 'Manage student records and configurable student fields.',
    },
    create: {
      key: FeatureKey.STUDENT_MANAGEMENT,
      name: 'Student Management',
      description: 'Manage student records and configurable student fields.',
    },
  });

  const fields = await Promise.all(
    STUDENT_MANAGEMENT_FIELDS.map((field) =>
      tx.featureField.upsert({
        where: {
          featureId_key: { featureId: feature.id, key: field.key },
        },
        update: {
          label: field.label,
          type: field.type,
          isCore: field.isCore,
          sortOrder: field.sortOrder,
        },
        create: { ...field, featureId: feature.id },
      }),
    ),
  );

  const targetSchoolIds = schoolIds
    ? [...new Set(schoolIds)]
    : (await tx.school.findMany({ select: { id: true } })).map(
        (school) => school.id,
      );

  if (targetSchoolIds.length === 0) {
    return {
      featureId: feature.id,
      fieldCount: fields.length,
      configuredSchoolCount: 0,
    };
  }

  await tx.schoolFeature.createMany({
    data: targetSchoolIds.map((schoolId) => ({
      schoolId,
      featureId: feature.id,
      // Student Management is available by default for every school.
      enabled: true,
    })),
    skipDuplicates: true,
  });

  await tx.schoolFeatureField.createMany({
    data: targetSchoolIds.flatMap((schoolId) =>
      fields.map((field) => ({
        schoolId,
        featureFieldId: field.id,
        enabled: true,
        // Core values are mandatory and are represented by real student columns.
        required: field.isCore,
      })),
    ),
    skipDuplicates: true,
  });

  return {
    featureId: feature.id,
    fieldCount: fields.length,
    configuredSchoolCount: targetSchoolIds.length,
  };
}
