import { describe, it, expect } from 'vitest'
import { AttestaraClient } from '../src/client.js'
import { DIDManager } from '../src/identity/index.js'
import { CredentialManager } from '../src/credentials/index.js'
import { ProverManager } from '../src/prover/index.js'
import { SessionManager } from '../src/negotiation/index.js'
import { CommitmentManager } from '../src/commitment/index.js'
import type { AttestaraConfig } from '@attestara/types'

const testConfig: AttestaraConfig = {
  agent: {
    did: 'did:ethr:0xabcdef1234567890abcdef1234567890abcdef12',
    keyFile: 'keys/test.json',
  },
  network: {
    chain: 'local',
    rpcUrl: 'http://127.0.0.1:8545',
  },
  prover: {
    mode: 'local',
    circuitDir: './circuits',
  },
}

describe('AttestaraClient', () => {
  it('should initialize with all modules', () => {
    const client = new AttestaraClient(testConfig)

    expect(client.identity).toBeInstanceOf(DIDManager)
    expect(client.credentials).toBeInstanceOf(CredentialManager)
    expect(client.prover).toBeInstanceOf(ProverManager)
    expect(client.negotiation).toBeInstanceOf(SessionManager)
    expect(client.commitment).toBeInstanceOf(CommitmentManager)
  })

  it('should expose identity module', () => {
    const client = new AttestaraClient(testConfig)
    expect(client.identity).toBeDefined()
    expect(client.identity.create).toBeTypeOf('function')
    expect(client.identity.resolve).toBeTypeOf('function')
  })

  it('should expose credentials module', () => {
    const client = new AttestaraClient(testConfig)
    expect(client.credentials).toBeDefined()
    expect(client.credentials.issue).toBeTypeOf('function')
    expect(client.credentials.verify).toBeTypeOf('function')
  })

  it('should expose prover module', () => {
    const client = new AttestaraClient(testConfig)
    expect(client.prover).toBeDefined()
    expect(client.prover.generateProof).toBeTypeOf('function')
    expect(client.prover.verifyProof).toBeTypeOf('function')
  })

  it('should expose negotiation module', () => {
    const client = new AttestaraClient(testConfig)
    expect(client.negotiation).toBeDefined()
    expect(client.negotiation.create).toBeTypeOf('function')
    expect(client.negotiation.get).toBeTypeOf('function')
    expect(client.negotiation.list).toBeTypeOf('function')
  })

  it('should expose commitment module', () => {
    const client = new AttestaraClient(testConfig)
    expect(client.commitment).toBeDefined()
    expect(client.commitment.create).toBeTypeOf('function')
    expect(client.commitment.get).toBeTypeOf('function')
    expect(client.commitment.list).toBeTypeOf('function')
    expect(client.commitment.verify).toBeTypeOf('function')
  })

  it('should create independent client instances', () => {
    const client1 = new AttestaraClient(testConfig)
    const client2 = new AttestaraClient(testConfig)

    expect(client1.negotiation).not.toBe(client2.negotiation)
    expect(client1.commitment).not.toBe(client2.commitment)
  })
})
