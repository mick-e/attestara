import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Commitment, CommitmentProof } from '@attestara/types'

// ── Shared state ────────────────────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  commitments: new Map<string, Commitment>(),
}))

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commit-001',
    sessionId: 'session-001',
    agreementHash: '0xabc123',
    parties: ['did:ethr:0x111', 'did:ethr:0x222'],
    credentialHashes: ['0xcred1'],
    proofs: [] as CommitmentProof[],
    txHash: null,
    blockNumber: null,
    verified: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

// ── Module mocks ────────────────────────────────────────────────────

vi.mock('@attestara/sdk', () => ({
  CommitmentManager: vi.fn().mockImplementation(() => ({
    list: vi.fn(async (filter?: { sessionId?: string }) => {
      const all = Array.from(hoisted.commitments.values())
      if (filter?.sessionId) return all.filter(c => c.sessionId === filter.sessionId)
      return all
    }),
    get: vi.fn(async (id: string) => hoisted.commitments.get(id) ?? undefined),
    verify: vi.fn(async (id: string) => {
      const c = hoisted.commitments.get(id)
      if (c) { c.verified = true; return true }
      return false
    }),
  })),
}))

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
  hoisted.commitments.clear()
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

afterEach(() => {
  logSpy.mockRestore()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// ── Tests ───────────────────────────────────────────────────────────

describe('attestara commitment', () => {
  describe('list', () => {
    it('lists commitments in table format', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())
      hoisted.commitments.set('commit-002', makeCommitment({ id: 'commit-002', verified: true }))

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'list'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('Commitments')
    })

    it('outputs JSON when --json is specified', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'list', '--json'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('commit-001')
    })

    it('filters by session when --session is provided', async () => {
      hoisted.commitments.set('commit-001', makeCommitment({ sessionId: 'sess-A' }))
      hoisted.commitments.set('commit-002', makeCommitment({ id: 'commit-002', sessionId: 'sess-B' }))

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'list', '--session', 'sess-A', '--json'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('sess-A')
      expect(output).not.toContain('sess-B')
    })
  })

  describe('show', () => {
    it('shows commitment details', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'show', 'commit-001'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('Commitment Details')
    })

    it('shows error for non-existent commitment', async () => {
      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'show', 'not-found'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('not found')
    })

    it('outputs JSON when --json is specified', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'show', 'commit-001', '--json'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      const parsed = JSON.parse(output)
      expect(parsed.id).toBe('commit-001')
    })
  })

  describe('verify', () => {
    it('verifies a commitment successfully', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'verify', 'commit-001'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('commit-001')
    })

    it('reports error for non-existent commitment', async () => {
      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'verify', 'not-found'])

      // Should set exit code or show error
      expect(process.exitCode).toBe(1)
    })

    it('outputs JSON on verify', async () => {
      hoisted.commitments.set('commit-001', makeCommitment())

      const { commitmentCommand } = await import('../../src/commands/commitment.js')
      const cmd = commitmentCommand()
      await cmd.parseAsync(['node', 'commitment', 'verify', 'commit-001', '--json'])

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(output).toContain('verified')
    })
  })
})
