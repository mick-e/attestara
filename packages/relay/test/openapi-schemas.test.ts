import { describe, it, expect } from 'vitest'
import {
  errorResponse,
  paginatedResponse,
  tokenResponse,
  agentSchema,
  sessionSchema,
  commitmentSchema,
  credentialSchema,
  webhookSchema,
  apiKeySchema,
  orgSchema,
  analyticsResponse,
  adminStatsResponse,
} from '../src/schemas/openapi.js'

describe('OpenAPI schemas', () => {
  describe('errorResponse', () => {
    it('has code, message, and requestId', () => {
      expect(errorResponse.properties.code.type).toBe('string')
      expect(errorResponse.properties.message.type).toBe('string')
      expect(errorResponse.properties.requestId.type).toBe('string')
    })
  })

  describe('paginatedResponse', () => {
    it('wraps items in data array with pagination', () => {
      const schema = paginatedResponse({ type: 'string' })
      expect(schema.type).toBe('object')
      expect(schema.properties.data.type).toBe('array')
      expect(schema.properties.pagination.properties.total.type).toBe('number')
    })
  })

  describe('tokenResponse', () => {
    it('includes access and refresh tokens', () => {
      expect(tokenResponse.properties.accessToken.type).toBe('string')
      expect(tokenResponse.properties.refreshToken.type).toBe('string')
      expect(tokenResponse.properties.expiresIn.type).toBe('number')
    })
  })

  describe('entity schemas', () => {
    it('agentSchema has required fields', () => {
      expect(agentSchema.properties.id.type).toBe('string')
      expect(agentSchema.properties.did.type).toBe('string')
      expect(agentSchema.properties.name.type).toBe('string')
    })

    it('sessionSchema has status field', () => {
      expect(sessionSchema.properties.status.type).toBe('string')
    })

    it('commitmentSchema has verified boolean', () => {
      expect(commitmentSchema.properties.verified.type).toBe('boolean')
    })

    it('credentialSchema has expiry', () => {
      expect(credentialSchema.properties.expiry.type).toBe('string')
    })

    it('webhookSchema has events array', () => {
      expect(webhookSchema.properties.events.type).toBe('array')
    })

    it('apiKeySchema has scopes', () => {
      expect(apiKeySchema.properties.scopes.type).toBe('array')
    })

    it('orgSchema has name', () => {
      expect(orgSchema.properties.name.type).toBe('string')
    })
  })

  describe('analytics schemas', () => {
    it('analyticsResponse has count fields', () => {
      expect(analyticsResponse.properties.agentCount.type).toBe('number')
      expect(analyticsResponse.properties.sessionCount.type).toBe('number')
    })

    it('adminStatsResponse has total fields', () => {
      expect(adminStatsResponse.properties.totalOrgs.type).toBe('number')
      expect(adminStatsResponse.properties.totalUsers.type).toBe('number')
    })
  })
})
