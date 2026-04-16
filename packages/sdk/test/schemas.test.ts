import { describe, it, expect } from 'vitest'
import { AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from '../src/credentials/schemas.js'

describe('credential schemas', () => {
  it('exports the correct credential type string', () => {
    expect(AGENT_AUTHORITY_CREDENTIAL_TYPE).toBe('AgentAuthorityCredential')
  })

  it('exports W3C VC context as an array', () => {
    expect(Array.isArray(CREDENTIAL_CONTEXT)).toBe(true)
    expect(CREDENTIAL_CONTEXT.length).toBe(2)
    expect(CREDENTIAL_CONTEXT[0]).toContain('w3.org')
    expect(CREDENTIAL_CONTEXT[1]).toContain('attestara.io')
  })

  it('credential context includes standard VC v1 URI', () => {
    expect(CREDENTIAL_CONTEXT).toContain('https://www.w3.org/2018/credentials/v1')
  })
})
