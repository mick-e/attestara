import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Module mocks ────────────────────────────────────────────────────

const mockSession = {
  id: 'sess-demo-001',
  status: 'active',
  turns: [] as Array<{
    agentId: string
    terms: { value: bigint; currency: string; deliveryDays: number }
    proof: Record<string, unknown>
    publicSignals: Record<string, unknown>
  }>,
  addTurn(turn: (typeof mockSession.turns)[0]) {
    this.turns.push(turn)
  },
  accept(_agentId: string) {
    // Accept the session
  },
}

vi.mock('@attestara/sdk', () => {
  const MockAgent = vi.fn().mockImplementation((opts: { name: string; mandate: { maxValue: bigint; currency: string; domain: string } }) => ({
    did: `did:ethr:mock:${opts.name}`,
    name: opts.name,
    mandate: opts.mandate,
    credential: {
      id: `cred-${opts.name}`,
      type: ['VerifiableCredential', 'AuthorityCredential'],
      issuer: `did:ethr:mock:${opts.name}`,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
      credentialSubject: {
        id: `did:ethr:mock:${opts.name}`,
        mandateParams: opts.mandate,
      },
      proof: { type: 'mock', created: new Date().toISOString(), verificationMethod: 'mock', proofPurpose: 'assertionMethod', jws: 'mock' },
    },
    privateKey: '0x' + '01'.repeat(32),
    publicKey: '0x' + '02'.repeat(33),
  }))

  const TestProver = vi.fn().mockImplementation(() => ({
    generateProof: vi.fn(async () => ({
      proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'], protocol: 'groth16', curve: 'bn128' },
      publicSignals: { signals: ['100'] },
      circuitId: 'MandateBound',
      circuitVersion: '1.0.0',
      generationTimeMs: 50,
    })),
    verifyProof: vi.fn(async () => ({ valid: true, circuitId: 'MandateBound', circuitVersion: '1.0.0', verificationTimeMs: 10 })),
  }))

  const SessionManager = vi.fn().mockImplementation(() => ({
    create: vi.fn(async () => mockSession),
  }))

  const CommitmentManager = vi.fn().mockImplementation(() => ({
    create: vi.fn(async (params: Record<string, unknown>) => ({
      id: 'commit-demo-001',
      sessionId: params.sessionId,
      agreementHash: '0xabc',
      parties: [],
      credentialHashes: [],
      proofs: [],
      txHash: null,
      blockNumber: null,
      verified: true,
      createdAt: new Date(),
    })),
  }))

  const CredentialManager = vi.fn().mockImplementation(() => ({
    hashCredential: vi.fn(() => '0xhash123'),
  }))

  const MemoryIPFSClient = vi.fn()
  const AttestaraClient = vi.fn()

  return { MockAgent, TestProver, SessionManager, CommitmentManager, CredentialManager, MemoryIPFSClient, AttestaraClient }
})

vi.mock('ora', () => ({
  default: () => ({
    start: () => ({
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
      stop: vi.fn(),
    }),
  }),
}))

// ── Lifecycle ───────────────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  mockSession.turns = []
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
  vi.clearAllMocks()
})

// ── Tests ───────────────────────────────────────────────────────────

describe('attestara demo', () => {
  it('has the correct command metadata', async () => {
    const { demoCommand } = await import('../../src/commands/demo.js')
    const cmd = demoCommand()
    expect(cmd.name()).toBe('demo')
    expect(cmd.description()).toContain('interactive')
  })

  it('help text includes budget, currency, and turns options', async () => {
    const { demoCommand } = await import('../../src/commands/demo.js')
    const help = demoCommand().helpInformation()
    expect(help).toContain('--buyer-budget')
    expect(help).toContain('--seller-min')
    expect(help).toContain('--currency')
    expect(help).toContain('--turns')
    expect(help).toContain('--json')
  })

  it('supports relay and rpc options for live mode', async () => {
    const { demoCommand } = await import('../../src/commands/demo.js')
    const help = demoCommand().helpInformation()
    expect(help).toContain('--relay-url')
    expect(help).toContain('--rpc-url')
    expect(help).toContain('--private-key')
  })
})
