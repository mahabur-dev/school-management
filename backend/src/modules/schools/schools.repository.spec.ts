import { PrismaService } from '../../prisma';
import * as featureBootstrap from '../features/feature-configuration.bootstrap';
import { SchoolsRepository } from './schools.repository';

describe('SchoolsRepository', () => {
  it('creates default feature configuration in the school creation transaction', async () => {
    const tx = {
      school: {
        create: jest.fn().mockResolvedValue({
          id: 'school-1',
          slug: 'northstar',
          users: [{ id: 'admin-1' }],
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const bootstrap = jest
      .spyOn(featureBootstrap, 'bootstrapFeatureConfiguration')
      .mockResolvedValue({
        featureCount: 2,
        fieldCount: 22,
        configuredSchoolCount: 1,
      });
    const repository = new SchoolsRepository(prisma);

    const result = await repository.createWithAdmin({
      name: 'Northstar Academy',
      slug: 'northstar',
      admin: {
        email: 'admin@northstar.test',
        passwordHash: 'hash',
        firstName: 'School',
        lastName: 'Administrator',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({ id: 'school-1', slug: 'northstar' }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.school.create).toHaveBeenCalledTimes(1);
    expect(bootstrap).toHaveBeenCalledWith(tx, ['school-1']);
  });
});
