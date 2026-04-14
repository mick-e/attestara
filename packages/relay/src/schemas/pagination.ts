import { z } from 'zod'

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationQuery>

export interface PaginationOpts {
  skip: number
  take: number
  orderBy: Record<string, 'asc' | 'desc'>
}

export function buildPaginationOpts(query: PaginationQuery): PaginationOpts {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: query.sortBy
      ? { [query.sortBy]: query.sortOrder }
      : { createdAt: query.sortOrder },
  }
}

export function buildPaginationResponse<T>(items: T[], total: number, query: PaginationQuery) {
  return {
    data: items,
    pagination: {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}
