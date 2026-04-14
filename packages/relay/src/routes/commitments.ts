import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { commitmentService } from '../services/commitment.service.js'

export async function clearCommitmentStores() {
  await commitmentService.clearStores()
}

const createCommitmentSchema = z.object({
  agreementHash: z.string().min(1),
  parties: z.array(z.string()),
  credentialHashes: z.array(z.string()),
  proofs: z.record(z.unknown()),
  circuitVersions: z.array(z.string()),
})

export const commitmentRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

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

    const result = await commitmentService.create({
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
    const queryParsed = paginationQuery.safeParse(request.query)
    if (!queryParsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: queryParsed.error.issues.map(i => i.message).join(', '),
        requestId: request.id,
      })
    }

    const opts = buildPaginationOpts(queryParsed.data)
    const [orgCommitments, total] = await Promise.all([
      commitmentService.listByOrg(auth.orgId, opts),
      commitmentService.countByOrg(auth.orgId),
    ])

    return reply.status(200).send(buildPaginationResponse(orgCommitments, total, queryParsed.data))
  })

  // GET /v1/commitments/:id
  app.get('/commitments/:id', {
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const commitment = await commitmentService.getById(id)

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
    const commitment = await commitmentService.verify(id)

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
