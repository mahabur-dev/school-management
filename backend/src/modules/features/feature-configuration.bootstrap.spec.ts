import { FeatureFieldType, FeatureKey, Prisma } from '../../prisma';
import {
  bootstrapFeatureConfiguration,
  FEE_MANAGEMENT_FIELDS,
  STUDENT_MANAGEMENT_FIELDS,
} from './feature-configuration.bootstrap';

describe('bootstrapFeatureConfiguration', () => {
  const features: Record<FeatureKey, { id: string }> = {
    [FeatureKey.STUDENT_MANAGEMENT]: { id: 'feature-students' },
    [FeatureKey.FEE_MANAGEMENT]: { id: 'feature-finance' },
  };
  const fields = [...STUDENT_MANAGEMENT_FIELDS, ...FEE_MANAGEMENT_FIELDS].map(
    (field, index) => ({
      id: `field-${index + 1}`,
      ...field,
    }),
  );

  it('backfills default access and fields without overwriting existing settings', async () => {
    const tx = {
      feature: {
        upsert: jest
          .fn()
          .mockImplementation(({ where }: { where: { key: FeatureKey } }) =>
            Promise.resolve(features[where.key]),
          ),
      },
      featureField: {
        upsert: jest
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where: { featureId_key: { featureId: string; key: string } };
            }) =>
              Promise.resolve(
                fields.find(
                  (field) =>
                    field.key === where.featureId_key.key &&
                    (where.featureId_key.featureId === 'feature-students'
                      ? STUDENT_MANAGEMENT_FIELDS.some(
                          (studentField) => studentField.key === field.key,
                        )
                      : FEE_MANAGEMENT_FIELDS.some(
                          (financeField) => financeField.key === field.key,
                        )),
                ),
              ),
          ),
      },
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-a' }]) },
      schoolFeature: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      schoolFeatureField: {
        createMany: jest.fn().mockResolvedValue({ count: fields.length }),
      },
      financeSetting: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    } as unknown as Prisma.TransactionClient;

    const result = await bootstrapFeatureConfiguration(tx);

    expect(result).toEqual({
      featureCount: 2,
      fieldCount: fields.length,
      configuredSchoolCount: 1,
    });
    expect(tx.feature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: FeatureKey.STUDENT_MANAGEMENT },
      }),
    );
    expect(tx.feature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: FeatureKey.FEE_MANAGEMENT } }),
    );
    expect(tx.featureField.upsert).toHaveBeenCalledTimes(fields.length);
    expect(tx.schoolFeature.createMany).toHaveBeenCalledWith({
      data: [
        {
          schoolId: 'school-a',
          featureId: 'feature-students',
          enabled: true,
        },
        {
          schoolId: 'school-a',
          featureId: 'feature-finance',
          enabled: false,
        },
      ],
      skipDuplicates: true,
    });
    expect(tx.schoolFeatureField.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          schoolId: 'school-a',
          featureFieldId: 'field-1',
          enabled: true,
          required: true,
        }),
        expect.objectContaining({
          schoolId: 'school-a',
          featureFieldId: 'field-4',
          enabled: true,
          required: false,
        }),
      ]),
      skipDuplicates: true,
    });
    expect(tx.financeSetting.createMany).toHaveBeenCalledWith({
      data: [{ schoolId: 'school-a' }],
      skipDuplicates: true,
    });
  });

  it('does not write access rows when there are no target schools', async () => {
    const tx = {
      feature: {
        upsert: jest
          .fn()
          .mockImplementation(({ where }: { where: { key: FeatureKey } }) =>
            Promise.resolve(features[where.key]),
          ),
      },
      featureField: {
        upsert: jest.fn().mockResolvedValue({
          id: 'field',
          type: FeatureFieldType.TEXT,
          isCore: false,
        }),
      },
      school: { findMany: jest.fn().mockResolvedValue([]) },
      schoolFeature: { createMany: jest.fn() },
      schoolFeatureField: { createMany: jest.fn() },
      financeSetting: { createMany: jest.fn() },
    } as unknown as Prisma.TransactionClient;

    const result = await bootstrapFeatureConfiguration(tx);

    expect(result.configuredSchoolCount).toBe(0);
    expect(tx.schoolFeature.createMany).not.toHaveBeenCalled();
    expect(tx.schoolFeatureField.createMany).not.toHaveBeenCalled();
    expect(tx.financeSetting.createMany).not.toHaveBeenCalled();
  });
});
