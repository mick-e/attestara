import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Module mocks ────────────────────────────────────────────────────

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => false),
  }
})

// ── Lifecycle ───────────────────────────────────────────────────────

let logSpy: ReturnType<typeof vi.spyOn>
let errSpy: ReturnType<typeof vi.spyOn>
let stdoutSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

afterEach(() => {
  logSpy.mockRestore()
  errSpy.mockRestore()
  stdoutSpy.mockRestore()
  vi.clearAllMocks()
})

// ── Tests ───────────────────────────────────────────────────────────

describe('attestara completion', () => {
  it('prints bash completion script to stdout', async () => {
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion', 'bash'])

    const written = stdoutSpy.mock.calls.map(c => String(c[0])).join('')
    expect(written).toContain('_attestara_completions')
    expect(written).toContain('complete -F')
  })

  it('prints zsh completion script to stdout', async () => {
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion', 'zsh'])

    const written = stdoutSpy.mock.calls.map(c => String(c[0])).join('')
    expect(written).toContain('#compdef attestara')
    expect(written).toContain('_attestara')
  })

  it('prints fish completion script to stdout', async () => {
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion', 'fish'])

    const written = stdoutSpy.mock.calls.map(c => String(c[0])).join('')
    expect(written).toContain('complete -c attestara')
  })

  it('shows error for unknown shell', async () => {
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion', 'powershell'])

    const output = [
      ...logSpy.mock.calls.map(c => String(c[0])),
      ...errSpy.mock.calls.map(c => String(c[0])),
    ].join('\n')
    expect(output).toContain('Unknown shell')
  })

  it('lists available shells when no argument given', async () => {
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion'])

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n')
    expect(output).toContain('bash')
    expect(output).toContain('zsh')
    expect(output).toContain('fish')
  })

  it('saves completion to file with --save', async () => {
    const fs = await import('fs')
    const { completionCommand } = await import('../../src/commands/completion.js')
    const cmd = completionCommand()
    await cmd.parseAsync(['node', 'completion', 'bash', '--save'])

    expect(fs.writeFileSync).toHaveBeenCalled()
  })
})
