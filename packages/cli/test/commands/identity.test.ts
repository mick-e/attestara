import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Shared state (hoisted) ───────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  state: {
    config: null as null | {
      agent: { did: string; keyFile: string; credentialFile?: string }
      network: { chain: string }
      prover: { mode: string }
    },
    savedConfig: null as unknown,
    saved: {} as Record<string, unknown>,
  },
}))

// ── Module mocks ─────────────────────────────────────────────────

vi.mock('../../src/config.js', () => ({
  CONFIG_FILE: '/tmp/.attestara/config.json',
  KEYS_DIR: '/tmp/.attestara/keys',
  CREDENTIALS_DIR: '/tmp/.attestara/credentials',
  requireConfig: vi.fn(async () => {
    if (!hoisted.state.config) {
      throw new Error(
        `No Attestara config found. Run 'attestara init' first.\n  Expected config at: /tmp/.attestara/config.json`,
      )
    }
    return hoisted.state.config
  }),
  saveConfig: vi.fn(async (cfg: unknown) => {
    hoisted.state.savedConfig = cfg
  }),
  saveKey: vi.fn(async (name: string, data: unknown) => {
    hoisted.state.saved[`key:${name}`] = data
    return `/tmp/.attestara/keys/${name}`
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

beforeEach(() => {
  hoisted.state.config = null
  hoisted.state.savedConfig = null
  hoisted.state.saved = {}
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  originalExitCode = process.exitCode
  process.exitCode = 0
})

afterEach(() => {
  logSpy.mockRestore()
  errSpy.mockRestore()
  process.exitCode = originalExitCode
  vi.clearAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────

describe('attestara identity', () => {
  it('create subcommand generates a DID and saves key', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')

    const cmd = identityCommand()
    await cmd.parseAsync(['node', 'identity', 'create', '--name', 'test-agent'])

    expect(hoisted.state.saved['key:agent.json']).toBeTruthy()
    const key = hoisted.state.saved['key:agent.json'] as {
      did: string
      publicKey: string
    }
    expect(key.did).toMatch(/^did:/)
    expect(key.publicKey).toBeTruthy()
  })

  it('create with existing config updates the config', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')
    hoisted.state.config = {
      agent: { did: 'did:ethr:0xOLD', keyFile: '/old/path' },
      network: { chain: 'local' },
      prover: { mode: 'local' },
    }

    const cmd = identityCommand()
    await cmd.parseAsync(['node', 'identity', 'create', '--name', 'fresh'])

    const savedCfg = hoisted.state.savedConfig as { agent: { did: string } }
    expect(savedCfg.agent.did).toMatch(/^did:/)
    expect(savedCfg.agent.did).not.toBe('did:ethr:0xOLD')
  })

  it('show prints error and sets exit code when no config exists', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')

    const cmd = identityCommand()
    await cmd.parseAsync(['node', 'identity', 'show'])

    expect(process.exitCode).toBe(1)
  })

  it('show with --json outputs JSON containing the DID', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')
    hoisted.state.config = {
      agent: { did: 'did:ethr:0xABC', keyFile: '/tmp/keys/agent.json' },
      network: { chain: 'arbitrum-sepolia' },
      prover: { mode: 'local' },
    }

    const cmd = identityCommand()
    await cmd.parseAsync(['node', 'identity', 'show', '--json'])

    const jsonCall = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('did:ethr:0xABC'),
    )
    expect(jsonCall).toBeTruthy()
  })

  it('rotate-key requires existing config', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')

    const cmd = identityCommand()
    await expect(
      cmd.parseAsync(['node', 'identity', 'rotate-key']),
    ).rejects.toThrow()
  })

  it('rotate-key with config saves a new key under the same DID', async () => {
    const { identityCommand } = await import('../../src/commands/identity.js')
    hoisted.state.config = {
      agent: { did: 'did:ethr:0xKEEP', keyFile: '/tmp/keys/agent.json' },
      network: { chain: 'arbitrum-sepolia' },
      prover: { mode: 'local' },
    }

    const cmd = identityCommand()
    await cmd.parseAsync(['node', 'identity', 'rotate-key'])

    const key = hoisted.state.saved['key:agent.json'] as {
      did: string
      rotatedAt: string
    }
    expect(key.did).toBe('did:ethr:0xKEEP')
    expect(key.rotatedAt).toBeTruthy()
  })
})
