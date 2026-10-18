import { FeatureFieldType, FeatureKey, Prisma } from '../../prisma';
import {
  bootstrapFeatureConfiguration,
  STUDENT_MANAGEMENT_FIELDS,
} from './feature-configuration.bootstrap';

describe('bootstrapFeatureConfiguration', () => {
  const feature = { id: 'feature-students' };
  const fields = STUDENT_MANAGEMENT_FIELDS.map((field, index) => ({
    id: `field-${index + 1}`,
    ...field,
  }));

  it('backfills default access and fields without overwriting existing settings', async () => {
    const tx = {
      feature: { upsert: jest.fn().mockResolvedValue(feature) },
      featureField: {
        upsert: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { featureId_key: { key: string } } }) =>
              Promise.resolve(
                fields.find((field) => field.key === where.featureId_key.key),
              ),
          ),
      },
      school: { findMany: jest.fn().mockResolvedValue([{ id: 'school-a' }]) },
      schoolFeature: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      schoolFeatureField: {
        createMany: jest.fn().mockResolvedValue({ count: fields.length }),
      },
    } as unknown as Prisma.TransactionClient;

    const result = await bootstrapFeatureConfiguration(tx);

    expect(result).toEqual({
      featureId: feature.id,
      fieldCount: STUDENT_MANAGEMENT_FIELDS.length,
      configuredSchoolCount: 1,
    });
    expect(tx.feature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: FeatureKey.STUDENT_MANAGEMENT },
      }),
    );
    expect(tx.featureField.upsert).toHaveBeenCalledTimes(
      STUDENT_MANAGEMENT_FIELDS.length,
    );
    expect(tx.schoolFeature.createMany).toHaveBeenCalledWith({
      data: [
        {
          schoolId: 'school-a',
          featureId: feature.id,
          enabled: true,
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
  });

  it('does not write access rows when there are no target schools', async () => {
    const tx = {
      feature: { upsert: jest.fn().mockResolvedValue(feature) },
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
    } as unknown as Prisma.TransactionClient;

    const result = await bootstrapFeatureConfiguration(tx);

    expect(result.configuredSchoolCount).toBe(0);
    expect(tx.schoolFeature.createMany).not.toHaveBeenCalled();
    expect(tx.schoolFeatureField.createMany).not.toHaveBeenCalled();
  });
});
