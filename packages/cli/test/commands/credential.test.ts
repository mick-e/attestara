import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Shared state (hoisted) ───────────────────────────────────────

const hoisted = vi.hoisted(() => ({
  state: {
    config: null as null | {
      agent: { did: string; keyFile: string }
      network: { chain: string }
      prover: { mode: string }
    },
    saved: {} as Record<string, unknown>,
  },
}))

// ── Module mocks ─────────────────────────────────────────────────

vi.mock('../../src/config.js', () => ({
  CONFIG_FILE: '/tmp/.attestara/config.json',
  CREDENTIALS_DIR: '/tmp/.attestara/credentials',
  requireConfig: vi.fn(async () => {
    if (!hoisted.state.config) {
      throw new Error(`No Attestara config found. Run 'attestara init' first.`)
    }
    return hoisted.state.config
  }),
  saveCredential: vi.fn(async (name: string, data: unknown) => {
    hoisted.state.saved[`cred:${name}`] = data
    return `/tmp/.attestara/credentials/${name}`
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
  hoisted.state.config = {
    agent: { did: 'did:ethr:0xAGENT', keyFile: '/tmp/keys/agent.json' },
    network: { chain: 'arbitrum-sepolia' },
    prover: { mode: 'local' },
  }
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

describe('attestara credential', () => {
  it('issue creates a credential for the configured DID', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')

    const cmd = credentialCommand()
    await cmd.parseAsync([
      'node',
      'credential',
      'issue',
      '--domain',
      'procurement.contracts',
      '--max-value',
      '500000',
      '--currency',
      'EUR',
    ])

    const keys = Object.keys(hoisted.state.saved)
    expect(keys.length).toBeGreaterThan(0)
    const cred = hoisted.state.saved[keys[0]] as {
      issuer: string
      credentialSubject: { mandateParams: { domain: string; currency: string } }
    }
    expect(cred.issuer).toBe('did:ethr:0xAGENT')
    expect(cred.credentialSubject.mandateParams.domain).toBe('procurement.contracts')
    expect(cred.credentialSubject.mandateParams.currency).toBe('EUR')
  })

  it('issue respects floor and ceiling options', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')

    const cmd = credentialCommand()
    await cmd.parseAsync([
      'node',
      'credential',
      'issue',
      '--domain',
      'trading',
      '--max-value',
      '1000000',
      '--floor',
      '100',
      '--ceiling',
      '900',
    ])

    const keys = Object.keys(hoisted.state.saved)
    const cred = hoisted.state.saved[keys[0]] as {
      credentialSubject: {
        mandateParams: {
          parameterFloor?: unknown
          parameterCeiling?: unknown
        }
      }
    }
    expect(cred.credentialSubject.mandateParams.parameterFloor).toBeDefined()
    expect(cred.credentialSubject.mandateParams.parameterCeiling).toBeDefined()
  })

  it('issue requires --domain', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')
    const cmd = credentialCommand()
    cmd.exitOverride()

    await expect(
      cmd.parseAsync(['node', 'credential', 'issue', '--max-value', '500000']),
    ).rejects.toThrow()
  })

  it('issue requires --max-value', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')
    const cmd = credentialCommand()
    cmd.exitOverride()

    await expect(
      cmd.parseAsync(['node', 'credential', 'issue', '--domain', 'procurement']),
    ).rejects.toThrow()
  })

  it('issue fails when config is missing', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')
    hoisted.state.config = null

    const cmd = credentialCommand()

    await expect(
      cmd.parseAsync([
        'node',
        'credential',
        'issue',
        '--domain',
        'procurement.contracts',
        '--max-value',
        '500000',
      ]),
    ).rejects.toThrow(/config/i)
  })

  it('list --json outputs [] when credentials dir is absent', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')

    const cmd = credentialCommand()
    await cmd.parseAsync(['node', 'credential', 'list', '--json'])

    const jsonCall = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].trim() === '[]',
    )
    expect(jsonCall).toBeTruthy()
  })

  it('show fails gracefully on unknown credential id', async () => {
    const { credentialCommand } = await import('../../src/commands/credential.js')

    const cmd = credentialCommand()
    await cmd.parseAsync(['node', 'credential', 'show', 'nonexistent-id'])

    expect(process.exitCode).toBe(1)
  })
})
