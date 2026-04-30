import type { FastifyPluginAsync } from 'fastify'
import type { CircuitId, ProofResult } from '@attestara/types'
import type { CircuitManager } from '../circuits.js'
import type { ProverCache } from '../cache.js'
import type { WorkerPool } from '../workers/pool.js'
import { proofRequestSchema, circuitInputSchemas, verifyRequestSchema, bundleRequestSchema } from '../validation.js'
import { ValidationError, CircuitNotFoundError } from '../errors.js'

export interface ProveDeps {
  circuitManager: CircuitManager
  cache: ProverCache
  workerPool: WorkerPool
}

async function generateCircuitProof(
  circuitId: string,
  rawInputs: Record<string, unknown>,
  deps: ProveDeps,
): Promise<ProofResult> {
  // Validate inputs against circuit-specific schema
  const inputSchema = circuitInputSchemas[circuitId]
  if (!inputSchema) {
    throw new CircuitNotFoundError(circuitId)
  }

  const parsed = inputSchema.safeParse(rawInputs)
  if (!parsed.success) {
    throw new ValidationError(
      `Invalid inputs for circuit ${circuitId}`,
      { issues: parsed.error.issues },
    )
  }

  // Flatten inputs to string record for snarkjs
  const inputs = flattenInputs(parsed.data as Record<string, unknown>)

  // Check cache
  const cached = await deps.cache.getProof(circuitId, inputs)
  if (cached) {
    return cached
  }

  // Get circuit artifacts
  const artifacts = deps.circuitManager.getArtifacts(circuitId)
  const meta = deps.circuitManager.getMetadata(circuitId)

  // Generate proof via worker pool
  const result = await deps.workerPool.submitProofGeneration(
    circuitId,
    artifacts.wasmPath,
    artifacts.zkeyPath,
    inputs,
  )

  // Convert snarkjs output to our ZKProof format
  const snarkProof = result.proof as {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }

  const pi_b_0 = snarkProof.pi_b[0]
  const pi_b_1 = snarkProof.pi_b[1]
  if (!pi_b_0 || !pi_b_1) throw new Error('Invalid proof: pi_b must have at least 2 elements')

  const proofResult: ProofResult = {
    proof: {
      pi_a: [snarkProof.pi_a[0] ?? '', snarkProof.pi_a[1] ?? ''] as [string, string],
      pi_b: [
        [pi_b_0[0] ?? '', pi_b_0[1] ?? ''] as [string, string],
        [pi_b_1[0] ?? '', pi_b_1[1] ?? ''] as [string, string],
      ] as [[string, string], [string, string]],
      pi_c: [snarkProof.pi_c[0] ?? '', snarkProof.pi_c[1] ?? ''] as [string, string],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals: {
      signals: result.publicSignals,
    },
    circuitId: circuitId as CircuitId,
    circuitVersion: meta?.version ?? '1.0.0',
    generationTimeMs: result.durationMs,
  }

  // Cache the result
  await deps.cache.setProof(circuitId, inputs, proofResult)

  return proofResult
}

/** Flatten nested inputs (e.g., arrays/tuples) into a flat string record for snarkjs */
function flattenInputs(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // snarkjs expects array inputs as arrays of strings
      result[key] = value as unknown as string
    } else {
      result[key] = String(value)
    }
  }
  return result
}

export const proveRoutes = (deps: ProveDeps): FastifyPluginAsync => async (app) => {
  // POST /prove/mandate-bound
  app.post('/prove/mandate-bound', async (request, reply) => {
    const body = proofRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }
    const result = await generateCircuitProof('MandateBound', body.data.inputs, deps)
    return reply.status(200).send(result)
  })

  // POST /prove/parameter-range
  app.post('/prove/parameter-range', async (request, reply) => {
    const body = proofRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }
    const result = await generateCircuitProof('ParameterRange', body.data.inputs, deps)
    return reply.status(200).send(result)
  })

  // POST /prove/credential-freshness
  app.post('/prove/credential-freshness', async (request, reply) => {
    const body = proofRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }
    const result = await generateCircuitProof('CredentialFreshness', body.data.inputs, deps)
    return reply.status(200).send(result)
  })

  // POST /prove/identity-binding
  app.post('/prove/identity-binding', async (request, reply) => {
    const body = proofRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }
    const result = await generateCircuitProof('IdentityBinding', body.data.inputs, deps)
    return reply.status(200).send(result)
  })

  // POST /prove/bundle — generate proofs for all four circuits
  app.post('/prove/bundle', async (request, reply) => {
    const body = bundleRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const start = Date.now()

    // Generate all proofs in parallel
    const [mandateBound, parameterRange, credentialFreshness, identityBinding] = await Promise.all([
      generateCircuitProof('MandateBound', body.data.mandateBound as Record<string, unknown>, deps),
      generateCircuitProof('ParameterRange', body.data.parameterRange as Record<string, unknown>, deps),
      generateCircuitProof('CredentialFreshness', body.data.credentialFreshness as Record<string, unknown>, deps),
      generateCircuitProof('IdentityBinding', body.data.identityBinding as Record<string, unknown>, deps),
    ])

    return reply.status(200).send({
      mandateBound,
      parameterRange,
      credentialFreshness,
      identityBinding,
      totalGenerationTimeMs: Date.now() - start,
    })
  })

  // POST /verify — verify a proof
  app.post('/verify', async (request, reply) => {
    const body = verifyRequestSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: body.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const { circuit, proof, publicSignals } = body.data
    const circuitId = circuit as string

    // Get verification key
    const artifacts = deps.circuitManager.getArtifacts(circuitId)
    const meta = deps.circuitManager.getMetadata(circuitId)

    const result = await deps.workerPool.submitProofVerification(
      circuitId,
      artifacts.verificationKey,
      publicSignals.signals,
      proof,
    )

    return reply.status(200).send({
      valid: result.valid,
      circuitId,
      circuitVersion: meta?.version ?? '1.0.0',
      verificationTimeMs: result.durationMs,
    })
  })
}
