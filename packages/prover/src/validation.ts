import { z } from 'zod'

// Common: all input values are stringified bigints
const bigintString = z.string().regex(/^\d+$/, 'Must be a non-negative integer string')

// MandateBound circuit inputs
export const mandateBoundInputSchema = z.object({
  commitment: bigintString,
  proposed: bigintString,
  max_value: bigintString,
  randomness: bigintString,
})

// ParameterRange circuit inputs
export const parameterRangeInputSchema = z.object({
  commitment_floor: bigintString,
  commitment_ceiling: bigintString,
  proposed: bigintString,
  floor_val: bigintString,
  ceiling_val: bigintString,
  r1: bigintString,
  r2: bigintString,
})

// CredentialFreshness circuit inputs
export const credentialFreshnessInputSchema = z.object({
  credential_hash: bigintString,
  current_timestamp: bigintString,
  issuance_timestamp: bigintString,
  expiry_timestamp: bigintString,
  credential_data_hash: bigintString,
  r: bigintString,
})

// IdentityBinding circuit inputs
export const identityBindingInputSchema = z.object({
  did_public_key: z.tuple([bigintString, bigintString]),
  session_commitment: bigintString,
  did_private_key: bigintString,
  session_id: bigintString,
  session_public_key: z.tuple([bigintString, bigintString]),
})

// Request body schema (matches what RemoteProver sends)
export const proofRequestSchema = z.object({
  inputs: z.record(z.unknown()),
})

// Verify request schema
export const verifyRequestSchema = z.object({
  circuit: z.enum(['MandateBound', 'ParameterRange', 'CredentialFreshness', 'IdentityBinding']),
  proof: z.object({
    pi_a: z.tuple([z.string(), z.string()]),
    pi_b: z.tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])]),
    pi_c: z.tuple([z.string(), z.string()]),
    protocol: z.literal('groth16'),
    curve: z.literal('bn128'),
  }),
  publicSignals: z.object({
    signals: z.array(z.string()),
  }),
})

// Bundle request schema
export const bundleRequestSchema = z.object({
  mandateBound: proofRequestSchema.shape.inputs,
  parameterRange: proofRequestSchema.shape.inputs,
  credentialFreshness: proofRequestSchema.shape.inputs,
  identityBinding: proofRequestSchema.shape.inputs,
})

// Map circuit IDs to their input validation schemas
export const circuitInputSchemas: Record<string, z.ZodSchema> = {
  MandateBound: mandateBoundInputSchema,
  ParameterRange: parameterRangeInputSchema,
  CredentialFreshness: credentialFreshnessInputSchema,
  IdentityBinding: identityBindingInputSchema,
}
