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

// ── Helpers ──────────────────────────────────────────────────────

async function createSession(counterparty = 'did:ethr:0xCOUNTERPARTY'): Promise<string> {
  const { sessionCommand, sessionManager } = await import(
    '../../src/commands/session.js'
  )
  const cmd = sessionCommand()
  await cmd.parseAsync([
    'node',
    'session',
    'create',
    '--counterparty',
    counterparty,
  ])
  const all = await sessionManager.list()
  return all[all.length - 1].id
}

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

  // Clear sessions between tests
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

describe('attestara negotiate', () => {
  it('propose submits a turn with ZK proof', async () => {
    const sessionId = await createSession()
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')
    const { sessionManager } = await import('../../src/commands/session.js')

    const cmd = negotiateCommand()
    await cmd.parseAsync([
      'node',
      'negotiate',
      'propose',
      '--session',
      sessionId,
      '--value',
      '400000',
      '--currency',
      'EUR',
      '--delivery',
      '60',
    ])

    const sess = await sessionManager.get(sessionId)
    expect(sess).toBeTruthy()
    expect(sess!.turns.length).toBe(1)
    expect(sess!.turns[0].terms.value).toBe(400000n)
    expect(sess!.turns[0].terms.currency).toBe('EUR')
    expect(sess!.turns[0].terms.deliveryDays).toBe(60)
  }, 30000)

  it('propose requires --session and --value', async () => {
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')

    const cmd = negotiateCommand()
    await cmd.parseAsync(['node', 'negotiate', 'propose'])
    expect(process.exitCode).toBe(1)

    process.exitCode = 0

    const cmd2 = negotiateCommand()
    await cmd2.parseAsync(['node', 'negotiate', 'propose', '--value', '100'])
    expect(process.exitCode).toBe(1)
  })

  it('propose with unknown session id sets exit code 1', async () => {
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')

    const cmd = negotiateCommand()
    await cmd.parseAsync([
      'node',
      'negotiate',
      'propose',
      '--session',
      'nonexistent-session',
      '--value',
      '100000',
    ])

    expect(process.exitCode).toBe(1)
  }, 30000)

  it('reject with unknown session id sets exit code 1', async () => {
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')

    const cmd = negotiateCommand()
    await cmd.parseAsync([
      'node',
      'negotiate',
      'reject',
      '--session',
      'nonexistent-session',
      '--reason',
      'test reason',
    ])

    expect(process.exitCode).toBe(1)
  })

  it('accept with unknown session id sets exit code 1', async () => {
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')

    const cmd = negotiateCommand()
    await cmd.parseAsync([
      'node',
      'negotiate',
      'accept',
      '--session',
      'nonexistent-session',
    ])

    expect(process.exitCode).toBe(1)
  })

  it('help text describes negotiate subcommands', async () => {
    const { negotiateCommand } = await import('../../src/commands/negotiate.js')
    const help = negotiateCommand().helpInformation()

    expect(help).toContain('propose')
    expect(help).toContain('accept')
    expect(help).toContain('reject')
  })
})
