/**
 * Tenant scoping for Prisma queries.
 *
 * `PrismaService.forSchool(schoolId)` returns a client where every query on a
 * tenant model is forced to the given school: reads and writes are filtered by
 * `schoolId`, and creates always stamp it. A repository therefore cannot
 * forget the filter, and a caller cannot move a row to another school.
 *
 * To make a new model tenant-aware: give it a `schoolId` column (+ index) in
 * schema.prisma and add its name to TENANT_MODELS.
 */
export const TENANT_MODELS: ReadonlySet<string> = new Set([
  'User',
  'SchoolFeature',
  'SchoolFeatureField',
  'Student',
]);

type Args = Record<string, unknown> | undefined;

const WHERE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

const UPDATE_OPERATIONS = new Set([
  'update',
  'updateMany',
  'updateManyAndReturn',
]);

/** Returns a copy of `args` that can only touch rows of `schoolId`. */
export function scopeArgs(
  operation: string,
  args: Args,
  schoolId: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(args ?? {}) };

  if (WHERE_OPERATIONS.has(operation)) {
    next.where = { ...(asRecord(next.where) ?? {}), schoolId };
  }

  if (UPDATE_OPERATIONS.has(operation)) {
    // A tenant row must never be re-assigned to another school.
    const { schoolId: _ignored, ...data } = asRecord(next.data) ?? {};
    void _ignored;
    next.data = data;
  }

  switch (operation) {
    case 'create':
      next.data = { ...(asRecord(next.data) ?? {}), schoolId };
      break;
    case 'createMany':
    case 'createManyAndReturn':
      next.data = Array.isArray(next.data)
        ? next.data.map((row) => ({ ...asRecord(row), schoolId }))
        : { ...(asRecord(next.data) ?? {}), schoolId };
      break;
    case 'upsert': {
      const { schoolId: _ignored, ...update } = asRecord(next.update) ?? {};
      void _ignored;
      next.where = { ...(asRecord(next.where) ?? {}), schoolId };
      next.create = { ...(asRecord(next.create) ?? {}), schoolId };
      next.update = update;
      break;
    }
  }

  return next;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
