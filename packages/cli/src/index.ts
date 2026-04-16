#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { identityCommand } from './commands/identity.js'
import { credentialCommand } from './commands/credential.js'
import { sessionCommand } from './commands/session.js'
import { negotiateCommand } from './commands/negotiate.js'
import { commitmentCommand } from './commands/commitment.js'
import { demoCommand } from './commands/demo.js'
import { doctorCommand } from './commands/doctor.js'
import { printError } from './output.js'
import { registerInteractiveFlag } from './interactive.js'

const program = new Command()
  .name('attestara')
  .description('Attestara CLI — agent-to-agent negotiation with verifiable credentials and ZK proofs')
  .version('0.1.0')
  .addHelpText('after', `
Getting Started:
  $ attestara init                          Initialize project (creates config + keys)
  $ attestara demo                          Run interactive end-to-end demo

Identity:
  $ attestara identity create               Create a new DID
  $ attestara identity show                 Show current identity

Credentials:
  $ attestara credential issue --domain procurement.contracts --max-value 500000
  $ attestara credential list               List all credentials

Negotiation:
  $ attestara session create --counterparty <did>
  $ attestara negotiate propose --session <id> --value 400000
  $ attestara negotiate accept --session <id>

Commitments:
  $ attestara commitment list               List on-chain commitments
  $ attestara commitment verify <id>        Verify commitment

All list/show commands support --json for machine-readable output.
Use --no-interactive to disable prompts (CI-friendly).
  `)

registerInteractiveFlag(program)

program.addCommand(initCommand())
program.addCommand(identityCommand())
program.addCommand(credentialCommand())
program.addCommand(sessionCommand())
program.addCommand(negotiateCommand())
program.addCommand(commitmentCommand())
program.addCommand(demoCommand())
program.addCommand(doctorCommand())

// Global error handler
program.hook('preAction', () => {
  // Ensure unhandled rejections in actions are caught
})

program.parseAsync(process.argv).catch((error: Error) => {
  printError(error.message)
  process.exitCode = 1
})
