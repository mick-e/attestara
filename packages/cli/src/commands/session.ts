import { Command } from 'commander'
import ora from 'ora'
import { SessionManager } from '@attestara/sdk'
import { CircuitId } from '@attestara/types'
import { requireConfig } from '../config.js'
import {
  printError,
  printDetail,
  printHeader,
  printJson,
  printTable,
  formatDate,
  formatCurrency,
  truncateId,
  statusColor,
  symbols,
  type TableColumn,
} from '../output.js'
import { promptIfMissing } from '../interactive.js'

// In-memory session manager for the CLI process (sessions are ephemeral in MVP)
const sessionManager = new SessionManager()

export { sessionManager }

export function sessionCommand(): Command {
  const session = new Command('session')
    .description('Manage negotiation sessions')
    .addHelpText('after', `
Examples:
  $ attestara session create --counterparty did:ethr:0xABC... --max-turns 10
  $ attestara session list
  $ attestara session list --json
  $ attestara session show <session-id>
    `)

  session
    .command('create')
    .description('Create a new negotiation session')
    .option('--counterparty <did>', 'Counterparty agent DID')
    .option('--max-turns <n>', 'Maximum negotiation turns', '10')
    .option('--turn-timeout <seconds>', 'Turn timeout in seconds', '300')
    .option('--session-timeout <seconds>', 'Session timeout in seconds', '3600')
    .option('--json', 'Output as JSON')
    .action(async (options, cmd) => {
      options.counterparty = await promptIfMissing(cmd, options.counterparty, {
        message: 'Counterparty agent DID:',
        validate: (v) => v.startsWith('did:') || 'Must be a valid DID (did:method:identifier)',
      })
      if (!options.counterparty) {
        printError('Missing required option: --counterparty')
        process.exitCode = 1
        return
      }
      const spinner = ora('Creating session...').start()

      try {
        const config = await requireConfig()

        const sess = await sessionManager.create({
          initiatorAgentId: config.agent.did,
          counterpartyAgentId: options.counterparty,
          sessionConfig: {
            maxTurns: parseInt(options.maxTurns, 10),
            turnTimeoutSeconds: parseInt(options.turnTimeout, 10),
            sessionTimeoutSeconds: parseInt(options.sessionTimeout, 10),
            requiredProofs: [CircuitId.MANDATE_BOUND, CircuitId.PARAMETER_RANGE],
          },
        })

        spinner.succeed('Session created!')

        if (options.json) {
          printJson({
            id: sess.id,
            initiator: sess.initiatorAgentId,
            counterparty: sess.counterpartyAgentId,
            status: sess.status,
            maxTurns: sess.config.maxTurns,
            createdAt: sess.createdAt.toISOString(),
          })
        } else {
          printDetail('Session ID', sess.id)
          printDetail('Initiator', truncateId(sess.initiatorAgentId, 30))
          printDetail('Counterparty', truncateId(sess.counterpartyAgentId, 30))
          printDetail('Status', statusColor(sess.status))
          printDetail('Max Turns', String(sess.config.maxTurns))
          printDetail('Created', formatDate(sess.createdAt))
        }
      } catch (error) {
        spinner.fail('Failed to create session')
        throw error
      }
    })

  session
    .command('list')
    .description('List negotiation sessions')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const sessions = await sessionManager.list()

      if (options.json) {
        printJson(sessions.map((s) => ({
          id: s.id,
          initiator: s.initiatorAgentId,
          counterparty: s.counterpartyAgentId,
          status: s.status,
          turnCount: s.turnCount,
          createdAt: s.createdAt.toISOString(),
        })))
        return
      }

      printHeader('Negotiation Sessions')

      const columns: TableColumn[] = [
        { header: 'ID', key: 'id', width: 20, format: (v) => truncateId(String(v), 20) },
        { header: 'Counterparty', key: 'counterparty', width: 24, format: (v) => truncateId(String(v), 24) },
        { header: 'Status', key: 'status', width: 18, format: (v) => statusColor(String(v)) },
        { header: 'Turns', key: 'turns', width: 6, align: 'right' },
        { header: 'Created', key: 'created', width: 20 },
      ]

      const rows = sessions.map((s) => ({
        id: s.id,
        counterparty: s.counterpartyAgentId,
        status: s.status,
        turns: s.turnCount,
        created: formatDate(s.createdAt),
      }))

      printTable(columns, rows)
    })

  session
    .command('show')
    .description('Show session detail with turns')
    .argument('<id>', 'Session ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const sess = await findSession(id)
      if (!sess) {
        printError(`Session not found: ${id}`)
        process.exitCode = 1
        return
      }

      if (options.json) {
        printJson({
          id: sess.id,
          initiator: sess.initiatorAgentId,
          counterparty: sess.counterpartyAgentId,
          status: sess.status,
          type: sess.sessionType,
          turnCount: sess.turnCount,
          merkleRoot: sess.merkleRoot,
          config: sess.config,
          createdAt: sess.createdAt.toISOString(),
          turns: sess.turns.map((t) => ({
            id: t.id,
            agent: t.agentId,
            sequence: t.sequenceNumber,
            terms: { value: t.terms.value.toString(), currency: t.terms.currency, deliveryDays: t.terms.deliveryDays },
            proofType: t.proofType,
            createdAt: t.createdAt.toISOString(),
          })),
        })
        return
      }

      printHeader('Session Details')
      printDetail('ID', sess.id)
      printDetail('Initiator', sess.initiatorAgentId)
      printDetail('Counterparty', sess.counterpartyAgentId)
      printDetail('Type', sess.sessionType)
      printDetail('Status', statusColor(sess.status))
      printDetail('Turn Count', `${sess.turnCount} / ${sess.config.maxTurns}`)
      printDetail('Merkle Root', sess.merkleRoot || '—')
      printDetail('Created', formatDate(sess.createdAt))

      if (sess.turns.length > 0) {
        console.log()
        printHeader('Turns')
        for (const turn of sess.turns) {
          const direction = turn.agentId === sess.initiatorAgentId
            ? symbols.arrow
            : symbols.arrowLeft
          const terms = turn.terms
          const valueStr = formatCurrency(terms.value, terms.currency)
          const deliveryStr = terms.deliveryDays ? ` / ${terms.deliveryDays} days` : ''
          console.log(`  Turn ${turn.sequenceNumber} ${direction} ${valueStr}${deliveryStr}  (${turn.proofType})`)
        }
      }
    })

  return session
}

async function findSession(id: string) {
  // Try exact match first, then partial
  const exact = await sessionManager.get(id)
  if (exact) return exact
  const all = await sessionManager.list()
  return all.find((s) => s.id.startsWith(id)) ?? null
}
