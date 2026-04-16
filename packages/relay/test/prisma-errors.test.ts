import { describe, it, expect, vi } from 'vitest'

// Mock @prisma/client since we don't have a real database
vi.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    meta?: Record<string, unknown>
    constructor(message: string, opts: { code: string; meta?: Record<string, unknown>; clientVersion: string }) {
      super(message)
      this.code = opts.code
      this.meta = opts.meta
      this.name = 'PrismaClientKnownRequestError'
    }
  }

  class PrismaClientValidationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'PrismaClientValidationError'
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
      PrismaClientValidationError,
    },
  }
})

import { mapPrismaError, isUniqueViolation, isNotFound } from '../src/utils/prisma-errors.js'
import { Prisma } from '@prisma/client'

describe('mapPrismaError', () => {
  it('maps P2002 to unique violation', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      meta: { target: ['email'] },
      clientVersion: '5.0.0',
    })
    const result = mapPrismaError(err)
    expect(result.code).toBe('UNIQUE_VIOLATION')
    expect(result.error).toContain('email')
  })

  it('maps P2025 to not found', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    })
    const result = mapPrismaError(err, 'agent')
    expect(result.code).toBe('NOT_FOUND')
    expect(result.error).toContain('agent')
  })

  it('maps P2003 to FK violation', () => {
    const err = new Prisma.PrismaClientKnownRequestError('FK', {
      code: 'P2003',
      clientVersion: '5.0.0',
    })
    const result = mapPrismaError(err)
    expect(result.code).toBe('FK_VIOLATION')
  })

  it('maps unknown Prisma codes to DB_ERROR', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unknown', {
      code: 'P9999',
      clientVersion: '5.0.0',
    })
    const result = mapPrismaError(err)
    expect(result.code).toBe('DB_ERROR')
  })

  it('maps validation errors', () => {
    const err = new Prisma.PrismaClientValidationError('Invalid data')
    const result = mapPrismaError(err)
    expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('maps unknown errors to DB_ERROR', () => {
    const result = mapPrismaError(new Error('random'))
    expect(result.code).toBe('DB_ERROR')
    expect(result.error).toContain('Unexpected')
  })
})

describe('isUniqueViolation', () => {
  it('returns true for P2002', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Dup', {
      code: 'P2002',
      clientVersion: '5.0.0',
    })
    expect(isUniqueViolation(err)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isUniqueViolation(new Error('nope'))).toBe(false)
  })
})

describe('isNotFound', () => {
  it('returns true for P2025', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    })
    expect(isNotFound(err)).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isNotFound(new Error('nope'))).toBe(false)
  })
})
