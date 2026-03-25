import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { commitmentService } from '../services/commitment.service.js'
import { sessionService } from '../services/session.service.js'

export function clearCommitmentStores() {
  commitmentService.clearStores()
}

export function getCommitmentStores() {
  return {
    commitments: (commitmentService as any).commitments as Map<string, unknown>,
    sessionIndex: (commitmentService as any).sessionIndex as Map<string, string>,
  }
}

const createCommitmentSchema = z.object({
  agreementHash: z.string().min(1),
  parties: z.array(z.string()),
  credentialHashes: z.array(z.string()),
  proofs: z.record(z.unknown()),
  circuitVersions: z.array(z.string()),
})

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!'

export const commitmentRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/sessions/:sessionId/commitment
  app.post('/sessions/:sessionId/commitment', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const parsed = createCommitmentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const result = commitmentService.create({
      sessionId,
      agreementHash: parsed.data.agreementHash,
      parties: parsed.data.parties,
      credentialHashes: parsed.data.credentialHashes,
      proofs: parsed.data.proofs,
      circuitVersions: parsed.data.circuitVersions,
    })

    if ('error' in result) {
      return reply.status(409).send({
        code: result.code,
        message: result.error,
        requestId: request.id,
      })
    }

    return reply.status(201).send(result)
  })

  // GET /v1/commitments
  app.get('/commitments', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = (request as any).auth as AuthContext
    const orgCommitments = commitmentService.listByOrg(auth.orgId, sessionService)

    return reply.status(200).send({
      data: orgCommitments,
      pagination: { total: orgCommitments.length, page: 1, pageSize: 50, totalPages: 1 },
    })
  })

  // GET /v1/commitments/:id
  app.get('/commitments/:id', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const commitment = commitmentService.getById(id)

    if (!commitment) {
      return reply.status(404).send({
        code: 'COMMITMENT_NOT_FOUND',
        message: 'Commitment not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(commitment)
  })

  // POST /v1/commitments/:id/verify
  app.post('/commitments/:id/verify', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const commitment = commitmentService.verify(id)

    if (!commitment) {
      return reply.status(404).send({
        code: 'COMMITMENT_NOT_FOUND',
        message: 'Commitment not found',
        requestId: request.id,
      })
    }

    return reply.status(200).send(commitment)
  })
}
