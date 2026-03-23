import { describe, it, expect } from 'vitest'
import { MockAgent } from '../src/testing/mock-agent.js'
import { LocalChain } from '../src/testing/local-chain.js'
import { TestCredentials } from '../src/testing/test-credentials.js'
import { SessionRecorder } from '../src/testing/session-recorder.js'
import { NegotiationSession } from '../src/negotiation/session.js'
import { CircuitId } from '@agentclear/types'
import type { ZKProof, PublicSignals, SessionConfig } from '@agentclear/types'

const fakeProof: ZKProof = {
  pi_a: ['0x1', '0x2'],
  pi_b: [['0x3', '0x4'], ['0x5', '0x6']],
  pi_c: ['0x7', '0x8'],
  protocol: 'groth16',
  curve: 'bn128',
}

const fakeSignals: PublicSignals = { signals: ['10000'] }

const defaultConfig: SessionConfig = {
  maxTurns: 10,
  turnTimeoutSeconds: 300,
  sessionTimeoutSeconds: 3600,
  requiredProofs: [CircuitId.MANDATE_BOUND],
}

describe('MockAgent', () => {
  it('should create an agent with DID and keys', () => {
    const agent = new MockAgent()
    expect(agent.did).toMatch(/^did:ethr:0x/)
    expect(agent.publicKey).toBeDefined()
    expect(agent.privateKey).toBeDefined()
    expect(agent.name).toMatch(/^test-agent-/)
  })

  it('should accept custom name and mandate', () => {
    const agent = new MockAgent({
      name: 'buyer',
      mandate: { maxValue: 50000n, currency: 'ETH', domain: 'art' },
    })
    expect(agent.name).toBe('buyer')
    expect(agent.mandate.maxValue).toBe(50000n)
    expect(agent.mandate.currency).toBe('ETH')
  })

  it('should create unique DIDs for different agents', () => {
    const a1 = new MockAgent()
    const a2 = new MockAgent()
    expect(a1.did).not.toBe(a2.did)
  })

  it('should issue a credential', async () => {
    const agent = new MockAgent()
    const credential = await agent.issueCredential()
    expect(credential.id).toMatch(/^urn:uuid:/)
    expect(credential.issuer).toBe(agent.did)
    expect(credential.credentialSubject.mandateParams.maxValue).toBe(10000n)
  })

  it('should get credential (auto-issue)', async () => {
    const agent = new MockAgent()
    const credential = await agent.getCredential()
    expect(credential.issuer).toBe(agent.did)

    // Calling again returns the same credential
    const same = await agent.getCredential()
    expect(same.id).toBe(credential.id)
  })

  it('should verify its own credential', async () => {
    const agent = new MockAgent()
    const credential = await agent.issueCredential()
    const result = await agent.verifyCredential(credential)
    expect(result.valid).toBe(true)
  })

  it('should hash a credential', async () => {
    const agent = new MockAgent()
    const credential = await agent.issueCredential()
    const hash = agent.hashCredential(credential)
    expect(hash).toBeDefined()
    expect(hash.length).toBe(64)
  })
})

describe('LocalChain', () => {
  it('should have default RPC URL', () => {
    const chain = new LocalChain()
    expect(chain.url).toBe('http://127.0.0.1:8545')
  })

  it('should accept custom RPC URL', () => {
    const chain = new LocalChain('http://localhost:9545')
    expect(chain.url).toBe('http://localhost:9545')
  })

  it('should track running state', async () => {
    const chain = new LocalChain()
    expect(chain.isRunning).toBe(false)

    await chain.start()
    expect(chain.isRunning).toBe(true)

    await chain.stop()
    expect(chain.isRunning).toBe(false)
  })

  it('should snapshot and revert', async () => {
    const chain = new LocalChain()
    await chain.start()

    const snapshotId = await chain.snapshot()
    expect(snapshotId).toBeDefined()

    await chain.revert(snapshotId)
    await chain.stop()
  })

  it('should throw on snapshot when not running', async () => {
    const chain = new LocalChain()
    await expect(chain.snapshot()).rejects.toThrow('not running')
  })
})

describe('TestCredentials', () => {
  const did = 'did:ethr:0xabcdef1234567890abcdef1234567890abcdef12'

  it('should create a basic credential', async () => {
    const cred = await TestCredentials.create(did)
    expect(cred.issuer).toBe(did)
    expect(cred.credentialSubject.mandateParams.maxValue).toBe(10000n)
    expect(cred.credentialSubject.mandateParams.currency).toBe('USDC')
  })

  it('should create a credential with overrides', async () => {
    const cred = await TestCredentials.create(did, {
      maxValue: 50000n,
      currency: 'ETH',
      domain: 'art',
    })
    expect(cred.credentialSubject.mandateParams.maxValue).toBe(50000n)
    expect(cred.credentialSubject.mandateParams.currency).toBe('ETH')
  })

  it('should create an expired credential', async () => {
    const cred = await TestCredentials.createExpired(did)
    const result = await TestCredentials.verify(cred)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Credential has expired')
  })

  it('should create a credential with bounds', async () => {
    const cred = await TestCredentials.createWithBounds(did, 100n, 5000n)
    expect(cred.credentialSubject.mandateParams.parameterFloor).toBe(100n)
    expect(cred.credentialSubject.mandateParams.parameterCeiling).toBe(5000n)
  })

  it('should create a restricted credential', async () => {
    const counterparty = 'did:ethr:0x1111111111111111111111111111111111111111'
    const cred = await TestCredentials.createRestricted(did, [counterparty])
    expect(cred.credentialSubject.mandateParams.allowedCounterparties).toEqual([counterparty])
  })

  it('should hash a credential', async () => {
    const cred = await TestCredentials.create(did)
    const hash = TestCredentials.hash(cred)
    expect(hash).toBeDefined()
    expect(hash.length).toBe(64)
  })
})

describe('SessionRecorder', () => {
  function createSession() {
    return new NegotiationSession({
      id: 'recorded-session',
      initiatorAgentId: 'did:ethr:0xAAA',
      counterpartyAgentId: 'did:ethr:0xBBB',
      sessionConfig: defaultConfig,
    })
  }

  it('should record turn events', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: { value: 5000n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(recorder.eventCount).toBe(1)
    expect(recorder.getEvents()[0].event.type).toBe('turn.proposed')
  })

  it('should track multiple events', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: { value: 5000n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })
    session.proposeTurn({
      agentId: 'did:ethr:0xBBB',
      terms: { value: 4500n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(recorder.eventCount).toBe(2)
    expect(recorder.getEventsByType('turn.proposed')).toHaveLength(1)
    expect(recorder.getEventsByType('turn.countered')).toHaveLength(1)
  })

  it('should extract turns from events', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: { value: 5000n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    const turns = recorder.getTurns()
    expect(turns).toHaveLength(1)
    expect(turns[0].terms.value).toBe(5000n)
  })

  it('should detect acceptance', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: { value: 5000n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    expect(recorder.wasAccepted).toBe(false)
    session.accept('did:ethr:0xBBB')
    expect(recorder.wasAccepted).toBe(true)
  })

  it('should detect rejection with reason', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    expect(recorder.wasRejected).toBe(false)
    session.reject('Too expensive')
    expect(recorder.wasRejected).toBe(true)
    expect(recorder.rejectionReason).toBe('Too expensive')
  })

  it('should return null rejection reason when not rejected', () => {
    const recorder = new SessionRecorder()
    expect(recorder.rejectionReason).toBeNull()
  })

  it('should clear events', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.reject('Done')
    expect(recorder.eventCount).toBe(1)

    recorder.clear()
    expect(recorder.eventCount).toBe(0)
  })

  it('should export to JSON', () => {
    const session = createSession()
    const recorder = new SessionRecorder()
    recorder.attach(session)

    session.proposeTurn({
      agentId: 'did:ethr:0xAAA',
      terms: { value: 5000n, currency: 'USDC' },
      proofType: CircuitId.MANDATE_BOUND,
      proof: fakeProof,
      publicSignals: fakeSignals,
    })

    const json = recorder.toJSON()
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].event.type).toBe('turn.proposed')
  })
})
