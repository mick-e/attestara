import { Command } from 'commander'
import ora from 'ora'
import { TestProver } from '@attestara/sdk'
import { CircuitId } from '@attestara/types'
import { requireConfig } from '../config.js'
import { sessionManager } from './session.js'
import {
  printSuccess,
  printError,
  printDetail,
  printJson,
  formatCurrency,
  statusColor,
} from '../output.js'
import { promptIfMissing } from '../interactive.js'

const prover = new TestProver()

export function negotiateCommand(): Command {
  const negotiate = new Command('negotiate')
    .description('Submit proposals and negotiate within a session')
    .addHelpText('after', `
Examples:
  $ attestara negotiate propose --session <id> --value 400000 --currency EUR --delivery 60
  $ attestara negotiate accept --session <id>
  $ attestara negotiate reject --session <id> --reason "Terms unacceptable"
    `)

  negotiate
    .command('propose')
    .description('Submit a proposal with ZK proof')
    .option('--session <id>', 'Session ID')
    .option('--value <amount>', 'Proposed value')
    .option('--currency <code>', 'Currency code', 'EUR')
    .option('--delivery <days>', 'Delivery days')
    .option('--payment-terms <terms>', 'Payment terms description')
    .option('--json', 'Output as JSON')
    .action(async (options, cmd) => {
      options.session = await promptIfMissing(cmd, options.session, {
        message: 'Session ID:',
        validate: (v) => v.length > 0 || 'Session ID is required',
      })
      options.value = await promptIfMissing(cmd, options.value, {
        message: 'Proposed value:',
        validate: (v) => /^\d+$/.test(v) || 'Must be a positive integer',
      })
      if (!options.session || !options.value) {
        printError('Missing required options: --session and --value')
        process.exitCode = 1
        return
      }
      const spinner = ora('Generating ZK proof and submitting proposal...').start()

      try {
        const config = await requireConfig()
        const sess = await findSession(options.session)
        if (!sess) {
          spinner.fail(`Session not found: ${options.session}`)
          process.exitCode = 1
          return
        }

        // Generate ZK proof
        spinner.text = 'Generating ZK proof...'
        const proofResult = await prover.generateProof(CircuitId.MANDATE_BOUND, {
          value: BigInt(options.value),
          maxValue: BigInt(options.value),
        })

        // Submit turn
        spinner.text = 'Submitting proposal...'
        const turn = sess.proposeTurn({
          agentId: config.agent.did,
          terms: {
            value: BigInt(options.value),
            currency: options.currency,
            deliveryDays: options.delivery ? parseInt(options.delivery, 10) : undefined,
            paymentTerms: options.paymentTerms,
          },
          proofType: CircuitId.MANDATE_BOUND,
          proof: proofResult.proof,
          publicSignals: proofResult.publicSignals,
        })

        spinner.succeed(`Proposal submitted (Turn ${turn.sequenceNumber})`)

        if (options.json) {
          printJson({
            turnId: turn.id,
            sessionId: turn.sessionId,
            sequence: turn.sequenceNumber,
            terms: {
              value: turn.terms.value.toString(),
              currency: turn.terms.currency,
              deliveryDays: turn.terms.deliveryDays,
            },
            proofType: turn.proofType,
            proofGenerationMs: proofResult.generationTimeMs,
          })
        } else {
          printDetail('Turn ID', turn.id)
          printDetail('Sequence', String(turn.sequenceNumber))
          printDetail('Value', formatCurrency(turn.terms.value, turn.terms.currency))
          if (turn.terms.deliveryDays) {
            printDetail('Delivery', `${turn.terms.deliveryDays} days`)
          }
          printDetail('Proof', `${turn.proofType} (${proofResult.generationTimeMs}ms)`)
        }
      } catch (error) {
        spinner.fail('Proposal failed')
        throw error
      }
    })

  negotiate
    .command('accept')
    .description('Accept current terms')
    .option('--session <id>', 'Session ID')
    .option('--json', 'Output as JSON')
    .action(async (options, cmd) => {
      options.session = await promptIfMissing(cmd, options.session, {
        message: 'Session ID:',
        validate: (v) => v.length > 0 || 'Session ID is required',
      })
      if (!options.session) {
        printError('Missing required option: --session')
        process.exitCode = 1
        return
      }
      const spinner = ora('Accepting terms...').start()

      try {
        const config = await requireConfig()
        const sess = await findSession(options.session)
        if (!sess) {
          spinner.fail(`Session not found: ${options.session}`)
          process.exitCode = 1
          return
        }

        const lastTurn = sess.turns[sess.turns.length - 1]
        sess.accept(config.agent.did)

        spinner.succeed('Terms accepted!')

        if (options.json) {
          printJson({
            sessionId: sess.id,
            status: sess.status,
            agreedTerms: lastTurn ? {
              value: lastTurn.terms.value.toString(),
              currency: lastTurn.terms.currency,
              deliveryDays: lastTurn.terms.deliveryDays,
            } : null,
          })
        } else {
          printDetail('Session', sess.id)
          printDetail('Status', statusColor(sess.status))
          if (lastTurn) {
            printDetail('Agreed Value', formatCurrency(lastTurn.terms.value, lastTurn.terms.currency))
            if (lastTurn.terms.deliveryDays) {
              printDetail('Delivery', `${lastTurn.terms.deliveryDays} days`)
            }
          }
          printSuccess('Negotiation completed successfully.')
        }
      } catch (error) {
        spinner.fail('Accept failed')
        throw error
      }
    })

  negotiate
    .command('reject')
    .description('Reject and terminate negotiation')
    .option('--session <id>', 'Session ID')
    .option('--reason <reason>', 'Rejection reason', 'No agreement reached')
    .option('--json', 'Output as JSON')
    .action(async (options, cmd) => {
      options.session = await promptIfMissing(cmd, options.session, {
        message: 'Session ID:',
        validate: (v) => v.length > 0 || 'Session ID is required',
      })
      if (!options.session) {
        printError('Missing required option: --session')
        process.exitCode = 1
        return
      }
      const spinner = ora('Rejecting negotiation...').start()

      try {
        const sess = await findSession(options.session)
        if (!sess) {
          spinner.fail(`Session not found: ${options.session}`)
          process.exitCode = 1
          return
        }

        sess.reject(options.reason)

        spinner.succeed('Negotiation rejected.')

        if (options.json) {
          printJson({
            sessionId: sess.id,
            status: sess.status,
            reason: options.reason,
          })
        } else {
          printDetail('Session', sess.id)
          printDetail('Status', statusColor(sess.status))
          printDetail('Reason', options.reason)
        }
      } catch (error) {
        spinner.fail('Rejection failed')
        throw error
      }
    })

  return negotiate
}

async function findSession(id: string) {
  const exact = await sessionManager.get(id)
  if (exact) return exact
  const all = await sessionManager.list()
  return all.find((s) => s.id.startsWith(id)) ?? null
}
