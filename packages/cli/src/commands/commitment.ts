import { Command } from 'commander'
import ora from 'ora'
import { CommitmentManager } from '@attestara/sdk'
import {
  printError,
  printDetail,
  printHeader,
  printJson,
  printTable,
  formatDate,
  truncateId,
  statusColor,
  type TableColumn,
} from '../output.js'

// In-memory commitment manager for the CLI process
const commitmentManager = new CommitmentManager()

export { commitmentManager }

export function commitmentCommand(): Command {
  const commitment = new Command('commitment')
    .description('Manage on-chain commitments')
    .addHelpText('after', `
Examples:
  $ attestara commitment list
  $ attestara commitment list --json
  $ attestara commitment show <id>
  $ attestara commitment verify <id>
    `)

  commitment
    .command('list')
    .description('List commitments')
    .option('--session <id>', 'Filter by session ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const filter = options.session ? { sessionId: options.session } : undefined
        const commitments = await commitmentManager.list(filter)

        if (options.json) {
          printJson(commitments.map((c) => ({
            id: c.id,
            sessionId: c.sessionId,
            agreementHash: c.agreementHash,
            parties: c.parties,
            txHash: c.txHash,
            blockNumber: c.blockNumber,
            verified: c.verified,
            createdAt: c.createdAt.toISOString(),
          })))
          return
        }

        printHeader('Commitments')

        const columns: TableColumn[] = [
          { header: 'ID', key: 'id', width: 14, format: (v) => truncateId(String(v), 14) },
          { header: 'Session', key: 'session', width: 14, format: (v) => truncateId(String(v), 14) },
          { header: 'Parties', key: 'parties', width: 8, align: 'right' },
          { header: 'Tx Hash', key: 'txHash', width: 16, format: (v) => v ? truncateId(String(v), 16) : '—' },
          { header: 'Verified', key: 'verified', width: 10, format: (v) => statusColor(v ? 'verified' : 'pending_acceptance') },
          { header: 'Created', key: 'created', width: 20 },
        ]

        const rows = commitments.map((c) => ({
          id: c.id,
          session: c.sessionId,
          parties: c.parties.length,
          txHash: c.txHash,
          verified: c.verified,
          created: formatDate(c.createdAt),
        }))

        printTable(columns, rows)
      } catch (error) {
        printError((error as Error).message)
        process.exitCode = 1
      }
    })

  commitment
    .command('show')
    .description('Show commitment detail with on-chain info')
    .argument('<id>', 'Commitment ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const c = await findCommitment(id)
        if (!c) {
          printError(`Commitment not found: ${id}`)
          process.exitCode = 1
          return
        }

        if (options.json) {
          printJson({
            id: c.id,
            sessionId: c.sessionId,
            agreementHash: c.agreementHash,
            parties: c.parties,
            credentialHashes: c.credentialHashes,
            txHash: c.txHash,
            blockNumber: c.blockNumber,
            verified: c.verified,
            proofCount: c.proofs.length,
            createdAt: c.createdAt.toISOString(),
          })
          return
        }

        printHeader('Commitment Details')
        printDetail('ID', c.id)
        printDetail('Session', c.sessionId)
        printDetail('Agreement Hash', c.agreementHash)
        printDetail('Parties', c.parties.join(', '))
        printDetail('Credential Hashes', c.credentialHashes.length > 0 ? c.credentialHashes.join(', ') : '—')
        printDetail('Proofs', String(c.proofs.length))
        printDetail('Tx Hash', c.txHash ?? '—')
        printDetail('Block Number', c.blockNumber !== null ? String(c.blockNumber) : '—')
        printDetail('Verified', statusColor(c.verified ? 'verified' : 'pending_acceptance'))
        printDetail('Created', formatDate(c.createdAt))
      } catch (error) {
        printError((error as Error).message)
        process.exitCode = 1
      }
    })

  commitment
    .command('verify')
    .description('Verify on-chain commitment')
    .argument('<id>', 'Commitment ID')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const spinner = ora('Verifying commitment on-chain...').start()

      try {
        const c = await findCommitment(id)
        if (!c) {
          spinner.fail(`Commitment not found: ${id}`)
          process.exitCode = 1
          return
        }

        const verified = await commitmentManager.verify(c.id)

        if (verified) {
          spinner.succeed('Commitment verified!')
        } else {
          spinner.fail('Commitment verification failed')
        }

        if (options.json) {
          printJson({ id: c.id, verified })
        } else {
          printDetail('Commitment ID', c.id)
          printDetail('Verified', statusColor(verified ? 'verified' : 'revoked'))
        }
      } catch (error) {
        spinner.fail('Verification failed')
        throw error
      }
    })

  return commitment
}

async function findCommitment(id: string) {
  const exact = await commitmentManager.get(id)
  if (exact) return exact
  // Try partial match
  const all = await commitmentManager.list()
  return all.find((c) => c.id.startsWith(id)) ?? null
}
