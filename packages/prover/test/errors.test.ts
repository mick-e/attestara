import { describe, it, expect } from 'vitest'
import {
  ProverError,
  CircuitNotFoundError,
  ProofGenerationError,
  ProofVerificationError,
  ValidationError,
  WorkerPoolError,
} from '../src/errors.js'

describe('ProverError', () => {
  it('creates error with code, message, and status', () => {
    const err = new ProverError('TEST_ERROR', 'something went wrong', 400)
    expect(err.code).toBe('TEST_ERROR')
    expect(err.message).toBe('something went wrong')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('ProverError')
  })

  it('defaults to 500 status code', () => {
    const err = new ProverError('ERR', 'msg')
    expect(err.statusCode).toBe(500)
  })

  it('includes details when provided', () => {
    const err = new ProverError('ERR', 'msg', 500, { circuitId: 'MandateBound' })
    expect(err.details).toEqual({ circuitId: 'MandateBound' })
  })
})

describe('CircuitNotFoundError', () => {
  it('has correct code and status', () => {
    const err = new CircuitNotFoundError('MandateBound')
    expect(err.code).toBe('CIRCUIT_NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.message).toContain('MandateBound')
  })
})

describe('ProofGenerationError', () => {
  it('has correct code and status', () => {
    const err = new ProofGenerationError('Failed to generate')
    expect(err.code).toBe('PROOF_GENERATION_FAILED')
    expect(err.statusCode).toBe(500)
  })
})

describe('ProofVerificationError', () => {
  it('has correct code and status', () => {
    const err = new ProofVerificationError('Verification failed')
    expect(err.code).toBe('PROOF_VERIFICATION_FAILED')
    expect(err.statusCode).toBe(500)
  })
})

describe('ValidationError', () => {
  it('has correct code and status', () => {
    const err = new ValidationError('Invalid input')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
  })
})

describe('WorkerPoolError', () => {
  it('has correct code and status', () => {
    const err = new WorkerPoolError('Pool exhausted')
    expect(err.code).toBe('WORKER_POOL_ERROR')
    expect(err.statusCode).toBe(503)
  })
})
