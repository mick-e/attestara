import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  CircuitId,
  CIRCUIT_NAMES,
  deriveCircuitIdString,
} from '../src/zk.js'
import type {
  ZKProof,
  PublicSignals,
  ProofResult,
  VerificationResult,
  MandateBoundInputs,
  ParameterRangeInputs,
  TurnProofBundle,
} from '../src/zk.js'
import type { Commitment, CommitmentProof, CommitmentRecord } from '../src/commitment.js'
import type { MandateParams, AuthorityCredential, CredentialProof } from '../src/credentials.js'
import type { AttestaraConfig, NetworkConfig, ProverConfig } from '../src/config.js'
import type { Session, SessionStatus, NegotiationTurn, Terms, TurnDecision } from '../src/negotiation.js'
import type { ApiError, AuthResponse, PaginatedResponse } from '../src/api.js'
import type { AgentRecord, DIDDocument } from '../src/did.js'
import { ErrorCode, AttestaraError } from '../src/errors.js'

describe('CircuitId enum', () => {
  it('has 4 circuit identifiers', () => {
    expect(Object.keys(CircuitId).length).toBe(8) // 4 keys + 4 reverse mappings
    expect(CircuitId.MANDATE_BOUND).toBe('MandateBound')
    expect(CircuitId.PARAMETER_RANGE).toBe('ParameterRange')
    expect(CircuitId.CREDENTIAL_FRESHNESS).toBe('CredentialFreshness')
    expect(CircuitId.IDENTITY_BINDING).toBe('IdentityBinding')
  })
})

describe('CIRCUIT_NAMES', () => {
  it('maps all circuits to kebab-case names', () => {
    expect(CIRCUIT_NAMES[CircuitId.MANDATE_BOUND]).toBe('mandate-bound')
    expect(CIRCUIT_NAMES[CircuitId.PARAMETER_RANGE]).toBe('parameter-range')
    expect(CIRCUIT_NAMES[CircuitId.CREDENTIAL_FRESHNESS]).toBe('credential-freshness')
    expect(CIRCUIT_NAMES[CircuitId.IDENTITY_BINDING]).toBe('identity-binding')
  })
})

describe('deriveCircuitIdString', () => {
  it('combines name and version', () => {
    expect(deriveCircuitIdString('mandate-bound', '1.0.0')).toBe('mandate-bound-1.0.0')
  })

  it('strips v prefix from version', () => {
    expect(deriveCircuitIdString('mandate-bound', 'v1.0.0')).toBe('mandate-bound-1.0.0')
  })

  it('handles version without v prefix', () => {
    expect(deriveCircuitIdString('parameter-range', '2.1.0')).toBe('parameter-range-2.1.0')
  })
})

describe('ErrorCode enum', () => {
  it('has standard error codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
  })
})

describe('AttestaraError', () => {
  it('creates error with code and message', () => {
    const err = new AttestaraError(ErrorCode.AGENT_NOT_FOUND, 'Agent not found')
    expect(err.code).toBe(ErrorCode.AGENT_NOT_FOUND)
    expect(err.message).toBe('Agent not found')
    expect(err.name).toBe('AttestaraError')
  })

  it('includes optional details', () => {
    const err = new AttestaraError(ErrorCode.VALIDATION_ERROR, 'Bad input', { field: 'email' })
    expect(err.details).toEqual({ field: 'email' })
  })

  it('is an instance of Error', () => {
    const err = new AttestaraError(ErrorCode.INTERNAL_ERROR, 'Oops')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('type structure assertions', () => {
  it('ZKProof has correct tuple structure', () => {
    const proof: ZKProof = {
      pi_a: ['1', '2'],
      pi_b: [['3', '4'], ['5', '6']],
      pi_c: ['7', '8'],
      protocol: 'groth16',
      curve: 'bn128',
    }
    expect(proof.pi_a).toHaveLength(2)
    expect(proof.pi_b).toHaveLength(2)
    expect(proof.pi_c).toHaveLength(2)
  })

  it('MandateParams has required and optional fields', () => {
    const params: MandateParams = {
      maxValue: 500000n,
      currency: 'EUR',
      domain: 'procurement',
    }
    expect(params.maxValue).toBe(500000n)
    expect(params.parameterFloor).toBeUndefined()
  })

  it('Terms value is bigint', () => {
    const terms: Terms = { value: 100000n, currency: 'EUR' }
    expect(typeof terms.value).toBe('bigint')
  })

  it('TurnDecision is a union type', () => {
    const counter: TurnDecision = { action: 'counter', terms: { value: 100n, currency: 'EUR' } }
    const accept: TurnDecision = { action: 'accept' }
    const reject: TurnDecision = { action: 'reject', reason: 'Too expensive' }
    expect(counter.action).toBe('counter')
    expect(accept.action).toBe('accept')
    expect(reject.action).toBe('reject')
  })
})
