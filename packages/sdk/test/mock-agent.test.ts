import { describe, it, expect } from 'vitest'
import { MockAgent } from '../src/testing/mock-agent.js'

describe('MockAgent', () => {
  it('creates an agent with default mandate', () => {
    const agent = new MockAgent()
    expect(agent.did).toMatch(/^did:ethr:0x/)
    expect(agent.name).toMatch(/^test-agent-/)
    expect(agent.mandate.maxValue).toBe(10000n)
    expect(agent.mandate.currency).toBe('USDC')
    expect(agent.publicKey).toBeTruthy()
    expect(agent.privateKey).toBeTruthy()
  })

  it('creates an agent with custom name', () => {
    const agent = new MockAgent({ name: 'buyer-bot' })
    expect(agent.name).toBe('buyer-bot')
  })

  it('creates an agent with custom mandate', () => {
    const agent = new MockAgent({
      mandate: {
        maxValue: 500000n,
        currency: 'EUR',
        domain: 'procurement',
      },
    })
    expect(agent.mandate.maxValue).toBe(500000n)
    expect(agent.mandate.currency).toBe('EUR')
  })

  it('generates unique DIDs for different agents', () => {
    const a = new MockAgent()
    const b = new MockAgent()
    expect(a.did).not.toBe(b.did)
  })

  it('issues a credential for the agent', async () => {
    const agent = new MockAgent()
    const cred = await agent.issueCredential()

    expect(cred.id).toBeTruthy()
    expect(cred.credentialSubject.id).toBe(agent.did)
    expect(cred.credentialSubject.mandateParams.maxValue).toBe(10000n)
  })

  it('returns the same credential on subsequent getCredential calls', async () => {
    const agent = new MockAgent()
    const cred1 = await agent.getCredential()
    const cred2 = await agent.getCredential()
    expect(cred1.id).toBe(cred2.id)
  })

  it('can hash a credential', async () => {
    const agent = new MockAgent()
    const cred = await agent.issueCredential()
    const hash = agent.hashCredential(cred)
    expect(hash).toBeTruthy()
    expect(typeof hash).toBe('string')
  })

  it('can verify a credential', async () => {
    const agent = new MockAgent()
    const cred = await agent.issueCredential()
    const result = await agent.verifyCredential(cred)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
