import { describe, it, expect } from 'vitest'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../src/schemas/pagination.js'

describe('buildPaginationOpts', () => {
  it('computes skip and take from page and pageSize', () => {
    const query = paginationQuery.parse({ page: 3, pageSize: 20 })
    const opts = buildPaginationOpts(query)
    expect(opts.skip).toBe(40) // (3 - 1) * 20
    expect(opts.take).toBe(20)
  })

  it('defaults orderBy to createdAt desc', () => {
    const query = paginationQuery.parse({})
    const opts = buildPaginationOpts(query)
    expect(opts.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('uses custom sortBy field', () => {
    const query = paginationQuery.parse({ sortBy: 'name', sortOrder: 'asc' })
    const opts = buildPaginationOpts(query)
    expect(opts.orderBy).toEqual({ name: 'asc' })
  })
})

describe('buildPaginationResponse', () => {
  it('builds paginated response with metadata', () => {
    const items = [{ id: '1' }, { id: '2' }]
    const query = paginationQuery.parse({ page: 1, pageSize: 10 })
    const response = buildPaginationResponse(items, 25, query)

    expect(response.data).toEqual(items)
    expect(response.pagination.total).toBe(25)
    expect(response.pagination.page).toBe(1)
    expect(response.pagination.pageSize).toBe(10)
    expect(response.pagination.totalPages).toBe(3) // ceil(25/10)
  })

  it('computes totalPages correctly with exact division', () => {
    const query = paginationQuery.parse({ page: 1, pageSize: 5 })
    const response = buildPaginationResponse([], 15, query)
    expect(response.pagination.totalPages).toBe(3)
  })

  it('handles zero total', () => {
    const query = paginationQuery.parse({})
    const response = buildPaginationResponse([], 0, query)
    expect(response.pagination.totalPages).toBe(0)
    expect(response.data).toEqual([])
  })
})
