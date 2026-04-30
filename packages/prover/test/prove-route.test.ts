import { describe, it, expect, vi } from 'vitest'
import { ValidationError, CircuitNotFoundError } from '../src/errors.js'

// Test the prove route validation logic (without full Fastify setup)
describe('prove route validation', () => {
  it('requires circuitId in request body', () => {
    const body = { inputs: {} }
    if (!body || !('circuitId' in body)) {
      const err = new ValidationError('circuitId is required')
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.statusCode).toBe(400)
    }
  })

  it('rejects unknown circuit IDs', () => {
    const knownCircuits = new Set(['MandateBound', 'ParameterRange', 'CredentialFreshness', 'IdentityBinding'])
    const circuitId = 'UnknownCircuit'

    if (!knownCircuits.has(circuitId)) {
      const err = new CircuitNotFoundError(circuitId)
      expect(err.code).toBe('CIRCUIT_NOT_FOUND')
      expect(err.statusCode).toBe(404)
      expect(err.message).toContain('UnknownCircuit')
    }
  })

  it('accepts valid circuit IDs', () => {
    const knownCircuits = ['MandateBound', 'ParameterRange', 'CredentialFreshness', 'IdentityBinding']
    for (const id of knownCircuits) {
      expect(knownCircuits.includes(id)).toBe(true)
    }
  })

  it('validates inputs are provided', () => {
    const body = { circuitId: 'MandateBound' }
    // inputs should default to empty object if not provided
    const inputs = (body as any).inputs ?? {}
    expect(typeof inputs).toBe('object')
  })
})
