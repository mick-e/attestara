import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Module mocks ────────────────────────────────────────────────────

vi.mock('../../src/config.js', () => ({
  CONFIG_FILE: '/tmp/.attestara/config.json',
  KEYS_DIR: '/tmp/.attestara/keys',
  CREDENTIALS_DIR: '/tmp/.attestara/credentials',
  loadConfig: vi.fn(async () => ({
    agent: { did: 'did:ethr:0x123', keyFile: '/tmp/.attestara/keys/agent.json' },
    network: {
      chain: 'arbitrum-sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    },
    prover: { mode: 'local' },
    relay: { url: 'http://localhost:3001' },
  })),
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  }
})

// Mock fetch globally to prevent network calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── Lifecycle ───────────────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  mockFetch.mockRejectedValue(new Error('Network unavailable'))
})

afterEach(() => {
  logSpy.mockRestore()
  vi.clearAllMocks()
})

// ── Tests ───────────────────────────────────────────────────────────

describe('attestara doctor', () => {
  it('runs all checks and displays summary', async () => {
    const { doctorCommand } = await import('../../src/commands/doctor.js')
    const cmd = doctorCommand()
    await cmd.parseAsync(['node', 'doctor'])

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
    expect(output).toContain('Attestara Doctor')
    expect(output).toContain('Node.js')
  })

  it('outputs JSON when --json flag is set', async () => {
    const { doctorCommand } = await import('../../src/commands/doctor.js')
    const cmd = doctorCommand()
    await cmd.parseAsync(['node', 'doctor', '--json'])

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
    const parsed = JSON.parse(output)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
    expect(parsed[0]).toHaveProperty('name')
    expect(parsed[0]).toHaveProperty('status')
  })

  it('reports Node.js version as ok on supported version', async () => {
    const { doctorCommand } = await import('../../src/commands/doctor.js')
    const cmd = doctorCommand()
    await cmd.parseAsync(['node', 'doctor', '--json'])

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
    const parsed = JSON.parse(output) as Array<{ name: string; status: string }>
    const nodeCheck = parsed.find(c => c.name === 'Node.js version')
    expect(nodeCheck).toBeTruthy()
    // We're running on Node 20+, so it should be ok
    expect(nodeCheck!.status).toBe('ok')
  })

  it('shows remediation hints for failed checks', async () => {
    const { doctorCommand } = await import('../../src/commands/doctor.js')
    const cmd = doctorCommand()
    await cmd.parseAsync(['node', 'doctor'])

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
    // keystore doesn't exist (mocked), so remediation should appear
    expect(output).toContain('Recommendations')
  })
})
