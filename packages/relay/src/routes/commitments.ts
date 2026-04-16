import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, type AuthContext } from '../middleware/auth.js'
import { paginationQuery, buildPaginationOpts, buildPaginationResponse } from '../schemas/pagination.js'
import { createCommitmentSchema } from '../schemas/commitment.js'
import { commitmentService } from '../services/commitment.service.js'
import { sessionService } from '../services/session.service.js'
import { recordAudit } from '../services/audit.service.js'
import {
  commitmentSchema,
  createCommitmentBody,
  errorResponse,
  paginatedResponse,
  paginationQuerySchema,
} from '../schemas/openapi.js'

export async function clearCommitmentStores() {
  await commitmentService.clearStores()
}

export const commitmentRoutes: FastifyPluginAsync = async (app) => {
  const JWT_SECRET = app.config.JWT_SECRET

  // POST /v1/sessions/:sessionId/commitment
  app.post('/sessions/:sessionId/commitment', {
    schema: {
      tags: ['Commitments'],
      summary: 'Anchor a commitment',
      description: 'Creates an on-chain commitment anchored to a negotiation session. Rejects if the session is expired or missing.',
      body: createCommitmentBody,
      response: { 201: commitmentSchema, 400: errorResponse, 404: errorResponse, 409: errorResponse, 410: errorResponse },
    },
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

    // Guard: reject anchoring a commitment on a missing or expired session.
    // Without this, S4's expiry invariant is defeated by the commitment route.
    const session = await sessionService.getSession(sessionId)
    if (!session) {
      return reply.status(404).send({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
        requestId: request.id,
      })
    }
    if (sessionService.isExpired(session)) {
      return reply.status(410).send({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired',
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

    void recordAudit({
      action: 'commitment.anchor',
      outcome: 'success',
      userId: request.auth!.userId,
      actorIp: request.ip,
      resource: `Commitment:${result.id}`,
      metadata: { sessionId },
    })

    return reply.status(201).send(result)
  })

  // GET /v1/commitments
  app.get('/commitments', {
    schema: {
      tags: ['Commitments'],
      summary: 'List commitments',
      description: 'Returns a paginated list of commitments for the authenticated organisation.',
      querystring: paginationQuerySchema,
      response: { 200: paginatedResponse(commitmentSchema), 400: errorResponse },
    },
    preHandler: [requireAuth(JWT_SECRET)],
  }, async (request, reply) => {
    const auth = request.auth!
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
    schema: {
      tags: ['Commitments'],
      summary: 'Get commitment by ID',
      description: 'Returns the details of a specific commitment including on-chain anchoring info.',
      response: { 200: commitmentSchema, 404: errorResponse },
    },
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
    schema: {
      tags: ['Commitments'],
      summary: 'Verify a commitment',
      description: 'Verifies an on-chain commitment by checking its ZK proofs and chain state.',
      response: { 200: commitmentSchema, 404: errorResponse },
    },
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
