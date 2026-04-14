import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Shared state (hoisted so it is available to the vi.mock factory) ─

const hoisted = vi.hoisted(() => ({
  state: {
    exists: false,
    savedConfig: null as unknown,
    saved: {} as Record<string, unknown>,
  },
}))

// ── Module mocks ─────────────────────────────────────────────────

vi.mock('../../src/config.js', () => ({
  CONFIG_DIR: '/tmp/.attestara',
  CONFIG_FILE: '/tmp/.attestara/config.json',
  KEYS_DIR: '/tmp/.attestara/keys',
  CREDENTIALS_DIR: '/tmp/.attestara/credentials',
  configExists: () => hoisted.state.exists,
  saveConfig: vi.fn(async (cfg: unknown) => {
    hoisted.state.savedConfig = cfg
  }),
  saveKey: vi.fn(async (name: string, data: unknown) => {
    hoisted.state.saved[`key:${name}`] = data
    return `/tmp/.attestara/keys/${name}`
  }),
  saveCredential: vi.fn(async (name: string, data: unknown) => {
    hoisted.state.saved[`cred:${name}`] = data
    return `/tmp/.attestara/credentials/${name}`
  }),
  defaultConfig: (did: string) => ({
    agent: { did, keyFile: '/tmp/.attestara/keys/agent.json' },
    network: {
      chain: 'arbitrum-sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      contracts: {},
    },
    prover: { mode: 'local' },
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

// ── Test lifecycle ───────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>
let errSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  hoisted.state.exists = false
  hoisted.state.savedConfig = null
  hoisted.state.saved = {}
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
  errSpy.mockRestore()
  vi.clearAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────

describe('attestara init', () => {
  it('creates config, keys, and credential on happy path', async () => {
    const { initCommand } = await import('../../src/commands/init.js')

    const cmd = initCommand()
    await cmd.parseAsync(['node', 'init', '--name', 'test-agent'])

    expect(hoisted.state.savedConfig).toBeTruthy()
    expect(hoisted.state.saved['key:agent.json']).toBeTruthy()
    expect(hoisted.state.saved['cred:authority.vc.json']).toBeTruthy()
  })

  it('respects --network option', async () => {
    const { initCommand } = await import('../../src/commands/init.js')

    const cmd = initCommand()
    await cmd.parseAsync(['node', 'init', '--network', 'local'])

    const saved = hoisted.state.savedConfig as { network: { chain: string } }
    expect(saved.network.chain).toBe('local')
  })

  it('refuses to overwrite existing config without --force', async () => {
    const { initCommand } = await import('../../src/commands/init.js')
    hoisted.state.exists = true

    const cmd = initCommand()
    await cmd.parseAsync(['node', 'init'])

    // Nothing should have been saved
    expect(hoisted.state.savedConfig).toBeNull()
    expect(Object.keys(hoisted.state.saved)).toHaveLength(0)
  })

  it('overwrites existing config with --force', async () => {
    const { initCommand } = await import('../../src/commands/init.js')
    hoisted.state.exists = true

    const cmd = initCommand()
    await cmd.parseAsync(['node', 'init', '--force'])

    expect(hoisted.state.savedConfig).toBeTruthy()
  })

  it('help text includes options', async () => {
    const { initCommand } = await import('../../src/commands/init.js')
    const help = initCommand().helpInformation()

    expect(help).toContain('--force')
    expect(help).toContain('--network')
    expect(help).toContain('--name')
    expect(help).toContain('Initialize')
  })
})
