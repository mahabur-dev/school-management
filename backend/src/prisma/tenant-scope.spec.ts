import { scopeArgs } from './tenant-scope';

const SCHOOL = 'school-a';

describe('scopeArgs', () => {
  it.each([
    'findMany',
    'findFirst',
    'findUnique',
    'count',
    'deleteMany',
    'updateMany',
  ])('forces schoolId into the where clause of %s', (operation) => {
    const result = scopeArgs(operation, { where: { id: 'u1' } }, SCHOOL);
    expect(result.where).toEqual({ id: 'u1', schoolId: SCHOOL });
  });

  it('overrides a caller-supplied schoolId filter', () => {
    const result = scopeArgs(
      'findMany',
      { where: { schoolId: 'school-b' } },
      SCHOOL,
    );
    expect(result.where).toEqual({ schoolId: SCHOOL });
  });

  it('adds a where clause when none was given', () => {
    expect(scopeArgs('findMany', undefined, SCHOOL).where).toEqual({
      schoolId: SCHOOL,
    });
  });

  it('stamps schoolId on create and overrides a foreign one', () => {
    const result = scopeArgs(
      'create',
      { data: { email: 'a@b.c', schoolId: 'school-b' } },
      SCHOOL,
    );
    expect(result.data).toEqual({ email: 'a@b.c', schoolId: SCHOOL });
  });

  it('stamps every row of createMany', () => {
    const result = scopeArgs(
      'createMany',
      { data: [{ email: 'a' }, { email: 'b', schoolId: 'school-b' }] },
      SCHOOL,
    );
    expect(result.data).toEqual([
      { email: 'a', schoolId: SCHOOL },
      { email: 'b', schoolId: SCHOOL },
    ]);
  });

  it('never lets an update move a row to another school', () => {
    const result = scopeArgs(
      'update',
      { where: { id: 'u1' }, data: { firstName: 'X', schoolId: 'school-b' } },
      SCHOOL,
    );
    expect(result.where).toEqual({ id: 'u1', schoolId: SCHOOL });
    expect(result.data).toEqual({ firstName: 'X' });
  });

  it('scopes all three parts of an upsert', () => {
    const result = scopeArgs(
      'upsert',
      {
        where: { id: 'u1' },
        create: { email: 'a' },
        update: { firstName: 'X', schoolId: 'school-b' },
      },
      SCHOOL,
    );
    expect(result.where).toEqual({ id: 'u1', schoolId: SCHOOL });
    expect(result.create).toEqual({ email: 'a', schoolId: SCHOOL });
    expect(result.update).toEqual({ firstName: 'X' });
  });

  it('does not mutate the caller args', () => {
    const args = { where: { id: 'u1' } };
    scopeArgs('findMany', args, SCHOOL);
    expect(args).toEqual({ where: { id: 'u1' } });
  });
});
