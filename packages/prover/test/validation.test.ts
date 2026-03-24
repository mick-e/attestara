import { describe, it, expect } from 'vitest'
import {
  mandateBoundInputSchema,
  parameterRangeInputSchema,
  credentialFreshnessInputSchema,
  identityBindingInputSchema,
  proofRequestSchema,
  verifyRequestSchema,
  bundleRequestSchema,
} from '../src/validation.js'

describe('mandateBoundInputSchema', () => {
  it('accepts valid inputs', () => {
    const result = mandateBoundInputSchema.safeParse({
      commitment: '12345',
      proposed: '42000',
      max_value: '50000',
      randomness: '99999',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-numeric strings', () => {
    const result = mandateBoundInputSchema.safeParse({
      commitment: 'abc',
      proposed: '42000',
      max_value: '50000',
      randomness: '99999',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = mandateBoundInputSchema.safeParse({
      commitment: '12345',
      proposed: '42000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative numbers', () => {
    const result = mandateBoundInputSchema.safeParse({
      commitment: '-1',
      proposed: '42000',
      max_value: '50000',
      randomness: '99999',
    })
    expect(result.success).toBe(false)
  })
})

describe('parameterRangeInputSchema', () => {
  it('accepts valid inputs', () => {
    const result = parameterRangeInputSchema.safeParse({
      commitment_floor: '111',
      commitment_ceiling: '222',
      proposed: '150',
      floor_val: '100',
      ceiling_val: '200',
      r1: '333',
      r2: '444',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    const result = parameterRangeInputSchema.safeParse({
      commitment_floor: '111',
    })
    expect(result.success).toBe(false)
  })
})

describe('credentialFreshnessInputSchema', () => {
  it('accepts valid inputs', () => {
    const result = credentialFreshnessInputSchema.safeParse({
      credential_hash: '555',
      current_timestamp: '1700000000',
      issuance_timestamp: '1600000000',
      expiry_timestamp: '1800000000',
      credential_data_hash: '666',
      r: '777',
    })
    expect(result.success).toBe(true)
  })
})

describe('identityBindingInputSchema', () => {
  it('accepts valid inputs with tuple arrays', () => {
    const result = identityBindingInputSchema.safeParse({
      did_public_key: ['111', '222'],
      session_commitment: '333',
      did_private_key: '444',
      session_id: '555',
      session_public_key: ['666', '777'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects arrays with wrong length', () => {
    const result = identityBindingInputSchema.safeParse({
      did_public_key: ['111'],
      session_commitment: '333',
      did_private_key: '444',
      session_id: '555',
      session_public_key: ['666', '777'],
    })
    expect(result.success).toBe(false)
  })
})

describe('proofRequestSchema', () => {
  it('accepts valid request body', () => {
    const result = proofRequestSchema.safeParse({
      inputs: { commitment: '123', proposed: '456' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing inputs field', () => {
    const result = proofRequestSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('verifyRequestSchema', () => {
  it('accepts valid verify request', () => {
    const result = verifyRequestSchema.safeParse({
      circuit: 'MandateBound',
      proof: {
        pi_a: ['1', '2'],
        pi_b: [['3', '4'], ['5', '6']],
        pi_c: ['7', '8'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: { signals: ['100', '200'] },
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown circuit name', () => {
    const result = verifyRequestSchema.safeParse({
      circuit: 'UnknownCircuit',
      proof: {
        pi_a: ['1', '2'],
        pi_b: [['3', '4'], ['5', '6']],
        pi_c: ['7', '8'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: { signals: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects wrong protocol', () => {
    const result = verifyRequestSchema.safeParse({
      circuit: 'MandateBound',
      proof: {
        pi_a: ['1', '2'],
        pi_b: [['3', '4'], ['5', '6']],
        pi_c: ['7', '8'],
        protocol: 'plonk',
        curve: 'bn128',
      },
      publicSignals: { signals: [] },
    })
    expect(result.success).toBe(false)
  })
})

describe('bundleRequestSchema', () => {
  it('accepts valid bundle request', () => {
    const result = bundleRequestSchema.safeParse({
      mandateBound: { commitment: '123' },
      parameterRange: { proposed: '456' },
      credentialFreshness: { credential_hash: '789' },
      identityBinding: { session_id: '101' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing circuit section', () => {
    const result = bundleRequestSchema.safeParse({
      mandateBound: { commitment: '123' },
    })
    expect(result.success).toBe(false)
  })
})
