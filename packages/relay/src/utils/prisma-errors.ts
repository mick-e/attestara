import { Prisma } from '@prisma/client'

export interface ServiceError {
  error: string
  code: string
}

/**
 * Map Prisma error codes to service-layer errors.
 */
export function mapPrismaError(err: unknown, context?: string): ServiceError {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') ?? 'field'
        return { error: `Unique constraint violation on ${target}`, code: 'UNIQUE_VIOLATION' }
      }
      case 'P2025':
        return { error: `Record not found${context ? `: ${context}` : ''}`, code: 'NOT_FOUND' }
      case 'P2003':
        return { error: 'Foreign key constraint failed', code: 'FK_VIOLATION' }
      default:
        return { error: `Database error: ${err.code}`, code: 'DB_ERROR' }
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { error: 'Invalid data provided', code: 'VALIDATION_ERROR' }
  }
  return { error: 'Unexpected database error', code: 'DB_ERROR' }
}

/**
 * Check if an error is a Prisma unique constraint violation.
 */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

/**
 * Check if an error is a Prisma not found error.
 */
export function isNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
}
