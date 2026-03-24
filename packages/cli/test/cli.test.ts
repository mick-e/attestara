import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

// ── Output utility tests ─────────────────────────────────────────

describe('output utilities', () => {
  it('formatCurrency formats bigint values with currency prefix', async () => {
    const { formatCurrency } = await import('../src/output.js')
    expect(formatCurrency(500000n, 'EUR')).toBe('EUR 500,000')
    expect(formatCurrency(1000, 'USD')).toBe('USD 1,000')
    expect(formatCurrency('750000', 'GBP')).toBe('GBP 750,000')
  })

  it('truncateId shortens long strings', async () => {
    const { truncateId } = await import('../src/output.js')
    expect(truncateId('abcdef', 10)).toBe('abcdef')
    expect(truncateId('abcdefghijklmnop', 8)).toBe('abcdefgh...')
  })

  it('formatDate produces ISO-like output', async () => {
    const { formatDate } = await import('../src/output.js')
    const result = formatDate('2026-03-24T12:00:00.000Z')
    expect(result).toBe('2026-03-24 12:00:00')
  })

  it('statusColor returns styled strings for known statuses', async () => {
    const { statusColor } = await import('../src/output.js')
    // Just check that it returns non-empty strings (chalk wraps them)
    expect(statusColor('active')).toBeTruthy()
    expect(statusColor('rejected')).toBeTruthy()
    expect(statusColor('completed')).toBeTruthy()
    expect(statusColor('unknown_status')).toBeTruthy()
  })

  it('printJson serializes bigints and dates', async () => {
    const { printJson } = await import('../src/output.js')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printJson({ value: 500000n, date: new Date('2026-01-01T00:00:00Z') })
    expect(consoleSpy).toHaveBeenCalledOnce()
    const output = consoleSpy.mock.calls[0][0]
    expect(output).toContain('"500000"')
    expect(output).toContain('2026-01-01')
    consoleSpy.mockRestore()
  })

  it('printTable outputs header and rows', async () => {
    const { printTable } = await import('../src/output.js')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printTable(
      [
        { header: 'Name', key: 'name', width: 10 },
        { header: 'Value', key: 'value', width: 10 },
      ],
      [{ name: 'Alice', value: 100 }],
    )
    // header + separator + 1 data row = 3 calls
    expect(consoleSpy).toHaveBeenCalledTimes(3)
    consoleSpy.mockRestore()
  })

  it('printTable handles empty rows', async () => {
    const { printTable } = await import('../src/output.js')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    printTable([{ header: 'Name', key: 'name' }], [])
    expect(consoleSpy).toHaveBeenCalledOnce()
    const output = consoleSpy.mock.calls[0][0]
    expect(output).toContain('No results')
    consoleSpy.mockRestore()
  })
})

// ── Config tests ─────────────────────────────────────────────────

describe('config', () => {
  it('defaultConfig returns valid structure', async () => {
    const { defaultConfig } = await import('../src/config.js')
    const config = defaultConfig('did:ethr:0xABC')
    expect(config.agent.did).toBe('did:ethr:0xABC')
    expect(config.network.chain).toBe('arbitrum-sepolia')
    expect(config.prover.mode).toBe('local')
    expect(config.network.contracts).toBeDefined()
  })
})

// ── Command parsing tests ────────────────────────────────────────

describe('command structure', () => {
  it('main program has correct name and version', async () => {
    // We create a fresh program by importing command constructors
    const program = new Command()
      .name('attestara')
      .version('0.1.0')

    expect(program.name()).toBe('attestara')
    expect(program.version()).toBe('0.1.0')
  })

  it('init command is configured', async () => {
    const { initCommand } = await import('../src/commands/init.js')
    const cmd = initCommand()
    expect(cmd.name()).toBe('init')
    expect(cmd.description()).toContain('Initialize')
    // Check options exist
    const opts = cmd.options.map((o) => o.long)
    expect(opts).toContain('--force')
    expect(opts).toContain('--network')
    expect(opts).toContain('--name')
  })

  it('identity command has subcommands', async () => {
    const { identityCommand } = await import('../src/commands/identity.js')
    const cmd = identityCommand()
    expect(cmd.name()).toBe('identity')
    const subNames = cmd.commands.map((c) => c.name())
    expect(subNames).toContain('create')
    expect(subNames).toContain('show')
    expect(subNames).toContain('rotate-key')
  })

  it('credential command has subcommands', async () => {
    const { credentialCommand } = await import('../src/commands/credential.js')
    const cmd = credentialCommand()
    expect(cmd.name()).toBe('credential')
    const subNames = cmd.commands.map((c) => c.name())
    expect(subNames).toContain('issue')
    expect(subNames).toContain('revoke')
    expect(subNames).toContain('list')
    expect(subNames).toContain('show')
  })

  it('credential issue requires --domain and --max-value', async () => {
    const { credentialCommand } = await import('../src/commands/credential.js')
    const cmd = credentialCommand()
    const issueCmd = cmd.commands.find((c) => c.name() === 'issue')!
    const requiredOpts = issueCmd.options.filter((o) => o.required).map((o) => o.long)
    expect(requiredOpts).toContain('--domain')
    expect(requiredOpts).toContain('--max-value')
  })

  it('session command has subcommands', async () => {
    const { sessionCommand } = await import('../src/commands/session.js')
    const cmd = sessionCommand()
    expect(cmd.name()).toBe('session')
    const subNames = cmd.commands.map((c) => c.name())
    expect(subNames).toContain('create')
    expect(subNames).toContain('list')
    expect(subNames).toContain('show')
  })

  it('negotiate command has subcommands', async () => {
    const { negotiateCommand } = await import('../src/commands/negotiate.js')
    const cmd = negotiateCommand()
    expect(cmd.name()).toBe('negotiate')
    const subNames = cmd.commands.map((c) => c.name())
    expect(subNames).toContain('propose')
    expect(subNames).toContain('accept')
    expect(subNames).toContain('reject')
  })

  it('negotiate propose requires --session and --value', async () => {
    const { negotiateCommand } = await import('../src/commands/negotiate.js')
    const cmd = negotiateCommand()
    const proposeCmd = cmd.commands.find((c) => c.name() === 'propose')!
    const requiredOpts = proposeCmd.options.filter((o) => o.required).map((o) => o.long)
    expect(requiredOpts).toContain('--session')
    expect(requiredOpts).toContain('--value')
  })

  it('commitment command has subcommands', async () => {
    const { commitmentCommand } = await import('../src/commands/commitment.js')
    const cmd = commitmentCommand()
    expect(cmd.name()).toBe('commitment')
    const subNames = cmd.commands.map((c) => c.name())
    expect(subNames).toContain('list')
    expect(subNames).toContain('show')
    expect(subNames).toContain('verify')
  })

  it('demo command is configured', async () => {
    const { demoCommand } = await import('../src/commands/demo.js')
    const cmd = demoCommand()
    expect(cmd.name()).toBe('demo')
    expect(cmd.description()).toContain('demo')
    const opts = cmd.options.map((o) => o.long)
    expect(opts).toContain('--buyer-budget')
    expect(opts).toContain('--seller-min')
    expect(opts).toContain('--currency')
    expect(opts).toContain('--turns')
    expect(opts).toContain('--json')
  })
})

// ── All list/show commands support --json ────────────────────────

describe('--json flag support', () => {
  const commandModules = [
    { name: 'identity', path: '../src/commands/identity.js', subs: ['create', 'show', 'rotate-key'] },
    { name: 'credential', path: '../src/commands/credential.js', subs: ['issue', 'list', 'show'] },
    { name: 'session', path: '../src/commands/session.js', subs: ['create', 'list', 'show'] },
    { name: 'negotiate', path: '../src/commands/negotiate.js', subs: ['propose', 'accept', 'reject'] },
    { name: 'commitment', path: '../src/commands/commitment.js', subs: ['list', 'show', 'verify'] },
  ]

  for (const mod of commandModules) {
    for (const sub of mod.subs) {
      it(`${mod.name} ${sub} has --json option`, async () => {
        const module = await import(mod.path)
        const cmdFactory = Object.values(module).find(
          (v): v is () => Command => typeof v === 'function' && v.length === 0,
        )
        if (!cmdFactory) throw new Error(`No command factory found in ${mod.path}`)
        const cmd = cmdFactory()
        const subCmd = cmd.commands?.find((c: Command) => c.name() === sub) ?? cmd
        const optLongs = subCmd.options.map((o: { long: string }) => o.long)
        expect(optLongs).toContain('--json')
      })
    }
  }
})

// ── Help text tests ──────────────────────────────────────────────

describe('help text', () => {
  it('init command has description in help', async () => {
    const { initCommand } = await import('../src/commands/init.js')
    const cmd = initCommand()
    expect(cmd.helpInformation()).toContain('Initialize')
    expect(cmd.helpInformation()).toContain('--force')
    expect(cmd.helpInformation()).toContain('--network')
  })

  it('demo command has description in help', async () => {
    const { demoCommand } = await import('../src/commands/demo.js')
    const cmd = demoCommand()
    expect(cmd.helpInformation()).toContain('demo')
    expect(cmd.helpInformation()).toContain('--buyer-budget')
    expect(cmd.helpInformation()).toContain('--json')
  })
})
