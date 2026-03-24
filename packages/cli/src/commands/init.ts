import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { MockAgent } from '@attestara/sdk'
import {
  configExists,
  saveConfig,
  saveKey,
  saveCredential,
  defaultConfig,
  CONFIG_FILE,
} from '../config.js'
import { printSuccess, printInfo, printWarning, printDetail, symbols } from '../output.js'

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new Attestara project (creates config, generates keys)')
    .option('--force', 'Overwrite existing config')
    .option('--network <network>', 'Target network (local, arbitrum-sepolia, arbitrum-one)', 'arbitrum-sepolia')
    .option('--name <name>', 'Agent name', 'my-agent')
    .addHelpText('after', `
Examples:
  $ attestara init
  $ attestara init --name procurement-agent
  $ attestara init --network local --force
    `)
    .action(async (options) => {
      if (configExists() && !options.force) {
        printWarning(`Config already exists at ${CONFIG_FILE}`)
        printInfo('Use --force to overwrite.')
        return
      }

      const spinner = ora('Initializing Attestara project...').start()

      try {
        // Create a mock agent to generate DID and keys
        spinner.text = 'Generating agent DID and keys...'
        const agent = new MockAgent({ name: options.name })

        // Save key file
        spinner.text = 'Saving keys...'
        const keyPath = await saveKey('agent.json', {
          did: agent.did,
          publicKey: agent.publicKey,
          privateKey: agent.privateKey,
          createdAt: new Date().toISOString(),
        })

        // Issue a test credential
        spinner.text = 'Issuing test credential...'
        const credential = await agent.issueCredential()
        const credPath = await saveCredential('authority.vc.json', credential)

        // Save config
        spinner.text = 'Writing config...'
        const config = defaultConfig(agent.did)
        config.network.chain = options.network as 'local' | 'arbitrum-sepolia' | 'arbitrum-one'
        await saveConfig(config)

        spinner.succeed('Attestara project initialized!')

        console.log()
        printDetail('Config', CONFIG_FILE)
        printDetail('Agent DID', agent.did)
        printDetail('Key file', keyPath)
        printDetail('Credential', credPath)
        printDetail('Network', config.network.chain)

        console.log()
        printSuccess('Ready! Run `attestara identity show` to see your agent details.')
        console.log()
        console.log(chalk.gray('  Next steps:'))
        console.log(chalk.gray(`    ${symbols.bullet} attestara identity show       — View your DID`))
        console.log(chalk.gray(`    ${symbols.bullet} attestara credential list     — View credentials`))
        console.log(chalk.gray(`    ${symbols.bullet} attestara demo                — Run interactive demo`))
      } catch (error) {
        spinner.fail('Initialization failed')
        throw error
      }
    })
}
