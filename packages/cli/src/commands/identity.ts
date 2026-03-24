import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { MockAgent } from '@attestara/sdk'
import { requireConfig, saveConfig, saveKey, CONFIG_FILE } from '../config.js'
import {
  printSuccess,
  printError,
  printDetail,
  printHeader,
  printJson,
  statusColor,
} from '../output.js'

export function identityCommand(): Command {
  const identity = new Command('identity')
    .description('Manage agent DID identity')
    .addHelpText('after', `
Examples:
  $ attestara identity create --name my-agent
  $ attestara identity show
  $ attestara identity show --json
  $ attestara identity rotate-key
    `)

  identity
    .command('create')
    .description('Create a new DID identity')
    .option('--name <name>', 'Agent name', 'my-agent')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Creating DID identity...').start()

      try {
        const agent = new MockAgent({ name: options.name })

        const keyPath = await saveKey('agent.json', {
          did: agent.did,
          publicKey: agent.publicKey,
          privateKey: agent.privateKey,
          createdAt: new Date().toISOString(),
        })

        // Update config if it exists
        try {
          const config = await requireConfig()
          config.agent.did = agent.did
          config.agent.keyFile = keyPath
          await saveConfig(config)
        } catch {
          // Config may not exist yet — that is fine
        }

        spinner.succeed('DID created!')

        if (options.json) {
          printJson({
            did: agent.did,
            publicKey: agent.publicKey,
            keyFile: keyPath,
            name: agent.name,
          })
        } else {
          printDetail('DID', agent.did)
          printDetail('Public Key', agent.publicKey.slice(0, 16) + '...')
          printDetail('Key File', keyPath)
          printDetail('Name', agent.name)
        }
      } catch (error) {
        spinner.fail('Failed to create DID')
        throw error
      }
    })

  identity
    .command('show')
    .description('Show current DID identity info')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const config = await requireConfig()

        const info = {
          did: config.agent.did,
          keyFile: config.agent.keyFile,
          credentialFile: config.agent.credentialFile ?? null,
          network: config.network.chain,
          proverMode: config.prover.mode,
          configFile: CONFIG_FILE,
        }

        if (options.json) {
          printJson(info)
        } else {
          printHeader('Agent Identity')
          printDetail('DID', info.did)
          printDetail('Key File', info.keyFile)
          printDetail('Credential', info.credentialFile ?? '—')
          printDetail('Network', info.network)
          printDetail('Prover', info.proverMode)
          printDetail('Config', info.configFile)
        }
      } catch (error) {
        printError((error as Error).message)
        process.exitCode = 1
      }
    })

  identity
    .command('rotate-key')
    .description('Rotate the agent DID key')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Rotating key...').start()

      try {
        const config = await requireConfig()

        // Generate new keys via a fresh MockAgent with same DID prefix
        const agent = new MockAgent({ name: `rotated-${Date.now()}` })

        const keyPath = await saveKey('agent.json', {
          did: config.agent.did,
          publicKey: agent.publicKey,
          privateKey: agent.privateKey,
          rotatedAt: new Date().toISOString(),
          previousKey: '(rotated)',
        })

        spinner.succeed('Key rotated!')

        if (options.json) {
          printJson({
            did: config.agent.did,
            newPublicKey: agent.publicKey,
            keyFile: keyPath,
          })
        } else {
          printDetail('DID', config.agent.did)
          printDetail('New Public Key', agent.publicKey.slice(0, 16) + '...')
          printDetail('Key File', keyPath)
          printSuccess('Key rotated successfully. Previous key has been replaced.')
        }
      } catch (error) {
        spinner.fail('Key rotation failed')
        throw error
      }
    })

  return identity
}
