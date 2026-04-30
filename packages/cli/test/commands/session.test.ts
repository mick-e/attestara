import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Shared state (hoisted) ───────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  state: {
    config: null as null | {
      agent: { did: string; keyFile: string }
      network: { chain: string }
      prover: { mode: string }
    },
  },
}))

// ── Module mocks ─────────────────────────────────────────────────

vi.mock('../../src/config.js', () => ({
  CONFIG_FILE: '/tmp/.attestara/config.json',
  requireConfig: vi.fn(async () => {
    if (!hoisted.state.config) {
      throw new Error(`No Attestara config found. Run 'attestara init' first.`)
    }
    return hoisted.state.config
  }),
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

// ── Lifecycle ────────────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>
let errSpy: ReturnType<typeof vi.spyOn>
let originalExitCode: number | string | undefined

beforeEach(async () => {
  hoisted.state.config = {
    agent: { did: 'did:ethr:0xINITIATOR', keyFile: '/tmp/keys/agent.json' },
    network: { chain: 'arbitrum-sepolia' },
    prover: { mode: 'local' },
  }
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  originalExitCode = process.exitCode
  process.exitCode = 0

  // Clear in-memory session manager
  const { sessionManager } = await import('../../src/commands/session.js')
  const all = await sessionManager.list()
  const mgr = sessionManager as unknown as { sessions?: Map<string, unknown> }
  if (mgr.sessions) {
    for (const s of all) mgr.sessions.delete(s.id)
  }
}, 60000)

afterEach(() => {
  logSpy.mockRestore()
  errSpy.mockRestore()
  process.exitCode = originalExitCode
  vi.clearAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────

describe('attestara session', () => {
  it('create produces a new session with correct participants', async () => {
    const { sessionCommand, sessionManager } = await import(
      '../../src/commands/session.js'
    )

    const cmd = sessionCommand()
    await cmd.parseAsync([
      'node',
      'session',
      'create',
      '--counterparty',
      'did:ethr:0xCOUNTERPARTY',
      '--max-turns',
      '5',
    ])

    const all = await sessionManager.list()
    expect(all.length).toBeGreaterThanOrEqual(1)
    const last = all[all.length - 1]
    expect(last.initiatorAgentId).toBe('did:ethr:0xINITIATOR')
    expect(last.counterpartyAgentId).toBe('did:ethr:0xCOUNTERPARTY')
    expect(last.config.maxTurns).toBe(5)
  })

  it('create requires --counterparty', async () => {
    const { sessionCommand } = await import('../../src/commands/session.js')
    const cmd = sessionCommand()

    await cmd.parseAsync(['node', 'session', 'create'])

    expect(process.exitCode).toBe(1)
    const output = [
      ...logSpy.mock.calls.map((c) => String(c[0])),
      ...errSpy.mock.calls.map((c) => String(c[0])),
    ].join('\n')
    expect(output.toLowerCase()).toContain('counterparty')
  })

  it('create fails when config is missing', async () => {
    const { sessionCommand } = await import('../../src/commands/session.js')
    hoisted.state.config = null

    const cmd = sessionCommand()
    await expect(
      cmd.parseAsync([
        'node',
        'session',
        'create',
        '--counterparty',
        'did:ethr:0xFOO',
      ]),
    ).rejects.toThrow(/config/i)
  })

  it('list --json outputs JSON', async () => {
    const { sessionCommand } = await import('../../src/commands/session.js')

    const cmd = sessionCommand()
    await cmd.parseAsync(['node', 'session', 'list', '--json'])

    const jsonCalls = logSpy.mock.calls
      .map((c) => c[0])
      .filter((v): v is string => typeof v === 'string')
    const parseable = jsonCalls.find((s) => {
      try {
        JSON.parse(s)
        return true
      } catch {
        return false
      }
    })
    expect(parseable).toBeTruthy()
  })

  it('show returns exit code 1 for unknown id', async () => {
    const { sessionCommand } = await import('../../src/commands/session.js')

    const cmd = sessionCommand()
    await cmd.parseAsync(['node', 'session', 'show', 'nonexistent-session-id'])

    expect(process.exitCode).toBe(1)
  })

  it('help text describes session subcommands', async () => {
    const { sessionCommand } = await import('../../src/commands/session.js')
    const help = sessionCommand().helpInformation()

    expect(help).toContain('negotiation sessions')
    expect(help).toContain('create')
    expect(help).toContain('list')
    expect(help).toContain('show')
  })
})
