export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PageParams = { page: number; limit: number };

/** Clamps untrusted page/limit and returns Prisma `skip` / `take`. */
export function getPagination(page = 1, limit = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function toPaginated<T>(items: T[], total: number, params: PageParams) {
  return {
    items,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(Math.ceil(total / params.limit), 1),
    },
  };
}
