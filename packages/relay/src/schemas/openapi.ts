/**
 * OpenAPI JSON Schema definitions for Fastify route schema options.
 * Used to generate accurate Swagger/OpenAPI documentation.
 *
 * NOTE on `additionalProperties: true`:
 * Fastify uses fast-json-stringify on the response body and STRIPS any field
 * that is not declared in `properties`. Many handlers return additional
 * fields beyond the documented shape (e.g. inviteToken, rawKey, secret,
 * walletAddress on auth responses). To preserve those fields without
 * over-specifying every handler return shape in the schema, response object
 * schemas declare `additionalProperties: true`. The documented properties
 * still control OpenAPI generation; `additionalProperties` only relaxes the
 * stringify behavior.
 */

// ── Reusable response schemas ────────────────────────────────────────

export const errorResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    code: { type: 'string' as const },
    message: { type: 'string' as const },
    requestId: { type: 'string' as const, format: 'uuid' },
  },
  // requestId intentionally NOT required: default Fastify validation errors
  // (FST_ERR_VALIDATION) don't carry a requestId, so requiring it would make
  // fast-json-stringify throw and surface as 500. Our custom global error
  // handler always sets requestId; this just keeps fallback paths safe.
  required: ['code', 'message'],
}

export const paginatedResponse = (itemSchema: Record<string, unknown>) => ({
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    data: { type: 'array' as const, items: itemSchema },
    pagination: {
      type: 'object' as const,
      additionalProperties: true,
      properties: {
        total: { type: 'number' as const },
        page: { type: 'number' as const },
        pageSize: { type: 'number' as const },
        totalPages: { type: 'number' as const },
      },
    },
  },
})

export const tokenResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    accessToken: { type: 'string' as const },
    refreshToken: { type: 'string' as const },
    expiresIn: { type: 'number' as const },
    user: {
      type: 'object' as const,
      additionalProperties: true,
      properties: {
        id: { type: 'string' as const },
        email: { type: 'string' as const, format: 'email' },
        orgId: { type: 'string' as const },
        role: { type: 'string' as const },
        walletAddress: { type: 'string' as const },
      },
    },
  },
}

// ── Auth schemas ─────────────────────────────────────────────────────

export const registerBody = {
  type: 'object' as const,
  required: ['email', 'password', 'orgName'],
  properties: {
    email: { type: 'string' as const, format: 'email' },
    password: { type: 'string' as const, minLength: 8 },
    orgName: { type: 'string' as const, minLength: 1, maxLength: 100 },
    walletAddress: { type: 'string' as const },
  },
}

export const loginBody = {
  type: 'object' as const,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string' as const, format: 'email' },
    password: { type: 'string' as const, minLength: 1 },
  },
}

export const refreshBody = {
  type: 'object' as const,
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string' as const, minLength: 1 },
  },
}

export const walletNonceBody = {
  type: 'object' as const,
  required: ['address'],
  properties: {
    address: { type: 'string' as const, pattern: '^0x[0-9a-fA-F]{40}$' },
  },
}

export const walletVerifyBody = {
  type: 'object' as const,
  required: ['message', 'signature'],
  properties: {
    message: { type: 'string' as const, minLength: 1 },
    signature: { type: 'string' as const, minLength: 1 },
  },
}

export const walletAuthBody = {
  type: 'object' as const,
  required: ['message', 'signature', 'address'],
  properties: {
    message: { type: 'string' as const, minLength: 1 },
    signature: { type: 'string' as const, minLength: 1 },
    address: { type: 'string' as const, minLength: 1 },
  },
}

// ── Agent schemas ────────────────────────────────────────────────────

export const agentSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    did: { type: 'string' as const },
    name: { type: 'string' as const },
    orgId: { type: 'string' as const },
    publicKey: { type: 'string' as const },
    status: { type: 'string' as const, enum: ['active', 'inactive'] },
    metadata: { type: 'object' as const, additionalProperties: true },
    createdAt: { type: 'string' as const, format: 'date-time' },
    updatedAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createAgentBody = {
  type: 'object' as const,
  required: ['did', 'name'],
  properties: {
    did: { type: 'string' as const, pattern: '^did:[a-z]+:.+$' },
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    publicKey: { type: 'string' as const, pattern: '^0x[0-9a-fA-F]+$' },
    metadata: { type: 'object' as const, additionalProperties: true },
  },
}

export const updateAgentBody = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    metadata: { type: 'object' as const, additionalProperties: true },
    status: { type: 'string' as const, enum: ['active', 'inactive'] },
  },
}

export const provisionDidBody = {
  type: 'object' as const,
  required: ['name'],
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
  },
}

// ── Credential schemas ───────────────────────────────────────────────

export const credentialSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    agentId: { type: 'string' as const },
    orgId: { type: 'string' as const },
    credentialHash: { type: 'string' as const },
    schemaHash: { type: 'string' as const },
    ipfsCid: { type: 'string' as const, nullable: true },
    credentialDataCached: { type: 'object' as const, additionalProperties: true, nullable: true },
    revoked: { type: 'boolean' as const },
    registeredTxHash: { type: 'string' as const, nullable: true },
    expiry: { type: 'string' as const, format: 'date-time' },
    createdAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createCredentialBody = {
  type: 'object' as const,
  required: ['agentId', 'credentialHash', 'schemaHash', 'expiry'],
  properties: {
    agentId: { type: 'string' as const, format: 'uuid' },
    credentialHash: { type: 'string' as const, minLength: 1 },
    schemaHash: { type: 'string' as const, minLength: 1 },
    ipfsCid: { type: 'string' as const },
    credentialData: { type: 'object' as const, additionalProperties: true },
    expiry: { type: 'string' as const, format: 'date-time' },
  },
}

// ── Session schemas ──────────────────────────────────────────────────

export const sessionSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    initiatorAgentId: { type: 'string' as const },
    counterpartyAgentId: { type: 'string' as const, nullable: true },
    initiatorOrgId: { type: 'string' as const },
    counterpartyOrgId: { type: 'string' as const },
    sessionType: { type: 'string' as const, enum: ['intra_org', 'cross_org'] },
    status: { type: 'string' as const },
    inviteTokenHash: { type: 'string' as const, nullable: true },
    sessionConfig: { type: 'object' as const, additionalProperties: true },
    merkleRoot: { type: 'string' as const, nullable: true },
    turnCount: { type: 'number' as const },
    anchorTxHash: { type: 'string' as const, nullable: true },
    createdAt: { type: 'string' as const, format: 'date-time' },
    updatedAt: { type: 'string' as const, format: 'date-time' },
    expiresAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createSessionBody = {
  type: 'object' as const,
  required: ['initiatorAgentId', 'initiatorOrgId', 'counterpartyOrgId'],
  properties: {
    initiatorAgentId: { type: 'string' as const, minLength: 1 },
    counterpartyAgentId: { type: 'string' as const, nullable: true },
    initiatorOrgId: { type: 'string' as const, minLength: 1 },
    counterpartyOrgId: { type: 'string' as const, minLength: 1 },
    sessionType: { type: 'string' as const, enum: ['intra_org', 'cross_org'], default: 'intra_org' },
    sessionConfig: { type: 'object' as const, additionalProperties: true },
  },
}

export const createTurnBody = {
  type: 'object' as const,
  required: ['agentId', 'terms', 'proofType', 'proof', 'publicSignals', 'signature'],
  properties: {
    agentId: { type: 'string' as const, minLength: 1 },
    terms: { type: 'object' as const, additionalProperties: true },
    proofType: { type: 'string' as const, minLength: 1 },
    proof: { type: 'object' as const, additionalProperties: true },
    publicSignals: { type: 'object' as const, additionalProperties: true },
    signature: { type: 'string' as const, minLength: 1 },
  },
}

export const acceptSessionBody = {
  type: 'object' as const,
  required: ['inviteToken'],
  properties: {
    inviteToken: { type: 'string' as const, minLength: 1 },
  },
}

export const turnSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    sessionId: { type: 'string' as const },
    agentId: { type: 'string' as const },
    sequenceNumber: { type: 'number' as const },
    terms: { type: 'object' as const, additionalProperties: true },
    proofType: { type: 'string' as const },
    proof: { type: 'object' as const, additionalProperties: true },
    publicSignals: { type: 'object' as const, additionalProperties: true },
    signature: { type: 'string' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
  },
}

// ── Commitment schemas ───────────────────────────────────────────────

export const commitmentSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    sessionId: { type: 'string' as const },
    agreementHash: { type: 'string' as const },
    parties: { type: 'array' as const, items: { type: 'string' as const } },
    credentialHashes: { type: 'array' as const, items: { type: 'string' as const } },
    proofs: { type: 'object' as const, additionalProperties: true },
    circuitVersions: { type: 'array' as const, items: { type: 'string' as const } },
    txHash: { type: 'string' as const, nullable: true },
    blockNumber: { type: 'number' as const, nullable: true },
    verified: { type: 'boolean' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createCommitmentBody = {
  type: 'object' as const,
  required: ['agreementHash', 'parties', 'credentialHashes', 'proofs', 'circuitVersions'],
  properties: {
    agreementHash: { type: 'string' as const, minLength: 1 },
    parties: { type: 'array' as const, items: { type: 'string' as const } },
    credentialHashes: { type: 'array' as const, items: { type: 'string' as const } },
    proofs: { type: 'object' as const, additionalProperties: true },
    circuitVersions: { type: 'array' as const, items: { type: 'string' as const } },
  },
}

// ── Org schemas ──────────────────────────────────────────────────────

export const orgSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    name: { type: 'string' as const },
    slug: { type: 'string' as const },
    plan: { type: 'string' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
    updatedAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createOrgBody = {
  type: 'object' as const,
  required: ['name'],
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 100 },
    plan: { type: 'string' as const },
  },
}

export const updateOrgBody = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 100 },
    plan: { type: 'string' as const },
  },
}

export const inviteBody = {
  type: 'object' as const,
  required: ['email'],
  properties: {
    email: { type: 'string' as const, format: 'email' },
    role: { type: 'string' as const, default: 'member' },
  },
}

// ── API Key schemas ──────────────────────────────────────────────────

export const apiKeySchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    orgId: { type: 'string' as const },
    name: { type: 'string' as const },
    keyHash: { type: 'string' as const },
    scopes: { type: 'array' as const, items: { type: 'string' as const } },
    expiresAt: { type: 'string' as const, format: 'date-time', nullable: true },
    lastUsedAt: { type: 'string' as const, format: 'date-time', nullable: true },
    createdAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const createApiKeyBody = {
  type: 'object' as const,
  required: ['name'],
  properties: {
    name: { type: 'string' as const, minLength: 1 },
    scopes: { type: 'array' as const, items: { type: 'string' as const }, default: [] },
    expiresAt: { type: 'string' as const, format: 'date-time' },
  },
}

// ── Webhook schemas ──────────────────────────────────────────────────

export const webhookSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    id: { type: 'string' as const },
    orgId: { type: 'string' as const },
    url: { type: 'string' as const, format: 'uri' },
    events: { type: 'array' as const, items: { type: 'string' as const } },
    active: { type: 'boolean' as const },
    createdAt: { type: 'string' as const, format: 'date-time' },
  },
}

export const registerWebhookBody = {
  type: 'object' as const,
  required: ['url', 'events'],
  properties: {
    url: { type: 'string' as const, format: 'uri' },
    events: { type: 'array' as const, items: { type: 'string' as const }, minItems: 1 },
  },
}

// ── Analytics schemas ────────────────────────────────────────────────

export const analyticsResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    agentCount: { type: 'number' as const },
    credentialCount: { type: 'number' as const },
    sessionCount: { type: 'number' as const },
    commitmentCount: { type: 'number' as const },
    activeSessionCount: { type: 'number' as const },
    avgTurnsPerSession: { type: 'number' as const },
  },
}

export const timeseriesQuery = {
  type: 'object' as const,
  required: ['metric'],
  properties: {
    metric: {
      type: 'string' as const,
      enum: ['sessions', 'proof_latency_p50', 'proof_latency_p95', 'gas_spent', 'commitments', 'credentials'],
    },
    days: { type: 'number' as const, minimum: 1, maximum: 365, default: 14 },
  },
}

// ── Admin schemas ────────────────────────────────────────────────────

export const adminStatsResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    totalOrgs: { type: 'number' as const },
    totalUsers: { type: 'number' as const },
    totalAgents: { type: 'number' as const },
    totalSessions: { type: 'number' as const },
    totalCommitments: { type: 'number' as const },
  },
}

// ── Billing schemas ──────────────────────────────────────────────────

export const topupBody = {
  type: 'object' as const,
  required: ['credits'],
  properties: {
    credits: { type: 'number' as const, minimum: 1, maximum: 100000 },
  },
}

export const billingUsageResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    orgId: { type: 'string' as const },
    periodStart: { type: 'string' as const, format: 'date-time' },
    periodEnd: { type: 'string' as const, format: 'date-time' },
    usage: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        additionalProperties: true,
        properties: {
          metric: { type: 'string' as const },
          count: { type: 'number' as const },
          limit: { type: 'number' as const },
        },
      },
    },
    totalCreditsUsed: { type: 'number' as const },
    creditsRemaining: { type: 'number' as const },
  },
}

export const billingPlanResponse = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    orgId: { type: 'string' as const },
    plan: { type: 'string' as const },
    credits: { type: 'number' as const },
    creditsUsed: { type: 'number' as const },
    renewsAt: { type: 'string' as const, format: 'date-time' },
  },
}

// ── Pagination query ─────────────────────────────────────────────────

export const paginationQuerySchema = {
  type: 'object' as const,
  properties: {
    page: { type: 'number' as const, minimum: 1, default: 1 },
    pageSize: { type: 'number' as const, minimum: 1, maximum: 100, default: 20 },
  },
}
