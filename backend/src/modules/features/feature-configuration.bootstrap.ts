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

/**
 * Finance fields are registered before finance transactions exist so a super
 * admin can configure the policy once and every later finance form shares the
 * same field contract. Accounting-critical inputs stay locked as core fields.
 */
export const FEE_MANAGEMENT_FIELDS = [
  {
    key: 'invoice_student_id',
    label: 'Student',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 10,
  },
  {
    key: 'invoice_due_date',
    label: 'Due date',
    type: FeatureFieldType.DATE,
    isCore: true,
    sortOrder: 20,
  },
  {
    key: 'invoice_items',
    label: 'Invoice items',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 30,
  },
  {
    key: 'invoice_currency',
    label: 'Currency',
    type: FeatureFieldType.SELECT,
    isCore: true,
    sortOrder: 40,
  },
  {
    key: 'invoice_academic_year',
    label: 'Academic year',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 50,
  },
  {
    key: 'invoice_billing_period',
    label: 'Billing period',
    type: FeatureFieldType.DATE,
    isCore: false,
    sortOrder: 60,
  },
  {
    key: 'invoice_note',
    label: 'Invoice note',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 70,
  },
  {
    key: 'invoice_external_reference',
    label: 'External reference',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 80,
  },
  {
    key: 'invoice_internal_remark',
    label: 'Internal remark',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 90,
  },
  {
    key: 'payment_amount',
    label: 'Payment amount',
    type: FeatureFieldType.NUMBER,
    isCore: true,
    sortOrder: 110,
  },
  {
    key: 'payment_method',
    label: 'Payment method',
    type: FeatureFieldType.SELECT,
    isCore: true,
    sortOrder: 120,
  },
  {
    key: 'payment_received_on',
    label: 'Received on',
    type: FeatureFieldType.DATE,
    isCore: true,
    sortOrder: 130,
  },
  {
    key: 'payment_allocations',
    label: 'Payment allocations',
    type: FeatureFieldType.TEXT,
    isCore: true,
    sortOrder: 140,
  },
  {
    key: 'payment_reference',
    label: 'Payment reference',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 150,
  },
  {
    key: 'payment_note',
    label: 'Payment note',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 160,
  },
  {
    key: 'payment_received_from',
    label: 'Received from',
    type: FeatureFieldType.TEXT,
    isCore: false,
    sortOrder: 170,
  },
] as const;

type FeatureDefinition = {
  key: FeatureKey;
  name: string;
  description: string;
  enabledByDefault: boolean;
  fields: ReadonlyArray<{
    key: string;
    label: string;
    type: FeatureFieldType;
    isCore: boolean;
    sortOrder: number;
  }>;
};

const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = [
  {
    key: FeatureKey.STUDENT_MANAGEMENT,
    name: 'Student Management',
    description: 'Manage student records and configurable student fields.',
    enabledByDefault: true,
    fields: STUDENT_MANAGEMENT_FIELDS,
  },
  {
    key: FeatureKey.FEE_MANAGEMENT,
    name: 'Fee & Invoice Management',
    description:
      'Manage school fees, invoices, payments, and configurable finance fields.',
    enabledByDefault: false,
    fields: FEE_MANAGEMENT_FIELDS,
  },
];

type FeatureConfigurationTransaction = Prisma.TransactionClient;

export type FeatureConfigurationBootstrapResult = {
  featureCount: number;
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
  const catalogue = await Promise.all(
    FEATURE_DEFINITIONS.map(async (definition) => {
      const feature = await tx.feature.upsert({
        where: { key: definition.key },
        update: { name: definition.name, description: definition.description },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
        },
      });
      const fields = await Promise.all(
        definition.fields.map((field) =>
          tx.featureField.upsert({
            where: { featureId_key: { featureId: feature.id, key: field.key } },
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
      return { definition, feature, fields };
    }),
  );

  const targetSchoolIds = schoolIds
    ? [...new Set(schoolIds)]
    : (await tx.school.findMany({ select: { id: true } })).map(
        (school) => school.id,
      );

  if (targetSchoolIds.length === 0) {
    return {
      featureCount: catalogue.length,
      fieldCount: catalogue.reduce(
        (count, item) => count + item.fields.length,
        0,
      ),
      configuredSchoolCount: 0,
    };
  }

  await tx.schoolFeature.createMany({
    data: targetSchoolIds.flatMap((schoolId) =>
      catalogue.map(({ feature, definition }) => ({
        schoolId,
        featureId: feature.id,
        enabled: definition.enabledByDefault,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.schoolFeatureField.createMany({
    data: targetSchoolIds.flatMap((schoolId) =>
      catalogue.flatMap(({ fields }) =>
        fields.map((field) => ({
          schoolId,
          featureFieldId: field.id,
          enabled:
            field.isCore ||
            ![
              'invoice_external_reference',
              'invoice_internal_remark',
              'payment_received_from',
            ].includes(field.key),
          required: field.isCore,
        })),
      ),
    ),
    skipDuplicates: true,
  });

  await tx.financeSetting.createMany({
    data: targetSchoolIds.map((schoolId) => ({ schoolId })),
    skipDuplicates: true,
  });

  return {
    featureCount: catalogue.length,
    fieldCount: catalogue.reduce(
      (count, item) => count + item.fields.length,
      0,
    ),
    configuredSchoolCount: targetSchoolIds.length,
  };
}
