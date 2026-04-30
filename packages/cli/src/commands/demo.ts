import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import {
  MockAgent,
  TestProver,
  SessionManager,
  CommitmentManager,
  CredentialManager,
  MemoryIPFSClient,
} from '@attestara/sdk'
import { CircuitId } from '@attestara/types'
import {
  printDetail,
  printInfo,
  formatCurrency,
  symbols,
} from '../output.js'

export function demoCommand(): Command {
  return new Command('demo')
    .description('Run an interactive end-to-end demo (2 agents, credentials, 5-turn negotiation, commitment)')
    .option('--buyer-budget <amount>', 'Buyer max budget', '500000')
    .option('--seller-min <amount>', 'Seller minimum price', '350000')
    .option('--currency <code>', 'Currency', 'EUR')
    .option('--turns <n>', 'Number of negotiation turns', '5')
    .option('--json', 'Output as JSON')
    .option('--relay-url <url>', 'Relay API URL (enables live mode)')
    .option('--rpc-url <url>', 'Arbitrum Sepolia RPC URL (enables on-chain commitments)')
    .option('--private-key <key>', 'Deployer private key for on-chain transactions')
    .addHelpText('after', `
Examples:
  $ attestara demo
  $ attestara demo --buyer-budget 1000000 --seller-min 700000 --currency USD
  $ attestara demo --turns 3 --json

  # Live mode — connects to deployed relay + Arbitrum Sepolia:
  $ attestara demo --relay-url https://attestara-relay.onrender.com \\
      --rpc-url https://arb-sepolia.g.alchemy.com/v2/KEY \\
      --private-key 0x...
    `)
    .action(async (options) => {
      const buyerBudget = BigInt(options.buyerBudget)
      const sellerMin = BigInt(options.sellerMin)
      const currency = options.currency
      const maxTurns = parseInt(options.turns, 10)

      const isLiveMode = !!(options.relayUrl || options.rpcUrl)

      console.log()
      console.log(chalk.bold(`Attestara v0.1.0 | Interactive Demo`))
      if (isLiveMode) {
        console.log(chalk.cyan(`  Mode: LIVE (relay + Arbitrum Sepolia)`))
        if (options.relayUrl) console.log(chalk.gray(`  Relay: ${options.relayUrl}`))
        if (options.rpcUrl) console.log(chalk.gray(`  RPC: ${options.rpcUrl.substring(0, 40)}...`))
      } else {
        console.log(chalk.gray(`  Mode: LOCAL (in-memory, no chain)`))
      }
      console.log(chalk.gray('─'.repeat(40)))
      console.log()

      // Load deployed contract addresses for live mode
      let contractAddresses: { agentRegistry: string; credentialRegistry: string; commitmentContract: string } | undefined
      if (isLiveMode) {
        try {
          const fs = await import('fs')
          const path = await import('path')
          const deploymentsPath = path.resolve(
            import.meta.dirname ?? '.',
            '../../contracts/deployments.arbitrum-sepolia.json',
          )
          if (fs.existsSync(deploymentsPath)) {
            const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'))
            contractAddresses = {
              agentRegistry: deployments.agentRegistry,
              credentialRegistry: deployments.credentialRegistry,
              commitmentContract: deployments.commitmentContract,
            }
            printDetail('CommitmentContract', contractAddresses.commitmentContract)
          }
        } catch (_err: unknown) {
          // Fall through — contracts optional
        }
      }

      // Step 1: Create agents
      const agentSpinner = ora('Creating agents...').start()
      const buyer = new MockAgent({
        name: 'buyer-agent',
        mandate: { maxValue: buyerBudget, currency, domain: 'procurement.contracts' },
      })
      const seller = new MockAgent({
        name: 'seller-agent',
        mandate: { maxValue: sellerMin * 2n, currency, domain: 'sales.contracts' },
      })
      agentSpinner.succeed('Agents created')
      printDetail('Buyer DID', buyer.did)
      printDetail('Seller DID', seller.did)

      // Step 2: Issue credentials
      const credSpinner = ora('Issuing credentials...').start()
      const buyerCred = await buyer.issueCredential()
      const sellerCred = await seller.issueCredential()

      const credManager = new CredentialManager(new MemoryIPFSClient())
      await credManager.verify(buyerCred)
      await credManager.verify(sellerCred)
      credSpinner.succeed('Credentials issued and verified')
      console.log(`  ${symbols.success} Buyer credential: ${buyerCred.credentialSubject.mandateParams.domain} up to ${formatCurrency(buyerBudget, currency)}`)
      console.log(`  ${symbols.success} Seller credential: ${sellerCred.credentialSubject.mandateParams.domain} up to ${formatCurrency(sellerMin * 2n, currency)}`)

      // Step 3: Generate ZK proofs
      const proofSpinner = ora('Generating ZK proofs...').start()
      const prover = new TestProver()
      const proofStart = Date.now()
      const buyerProof = await prover.generateProof(CircuitId.MANDATE_BOUND, {
        value: buyerBudget,
        maxValue: buyerBudget,
      })
      await prover.generateProof(CircuitId.MANDATE_BOUND, {
        value: sellerMin,
        maxValue: sellerMin * 2n,
      })
      await prover.generateProof(CircuitId.PARAMETER_RANGE, {
        min: sellerMin,
        max: buyerBudget,
      })
      const proofMs = Date.now() - proofStart
      proofSpinner.succeed(`ZK proofs generated (3 proofs, ${proofMs}ms)`)

      // Step 4: Create session and negotiate
      // Use relay-backed session manager in live mode
      const sessionManager = options.relayUrl
        ? new SessionManager({ url: options.relayUrl })
        : new SessionManager()

      const sess = await sessionManager.create({
        initiatorAgentId: buyer.did,
        counterpartyAgentId: seller.did,
        sessionConfig: {
          maxTurns: maxTurns + 2, // extra room for final accept
          turnTimeoutSeconds: 300,
          sessionTimeoutSeconds: 3600,
          requiredProofs: [CircuitId.MANDATE_BOUND, CircuitId.PARAMETER_RANGE],
        },
      })

      console.log()
      printInfo(`Session: ${sess.id}`)
      console.log(`  ${symbols.success} Session anchored${isLiveMode ? ' (relay-backed)' : ''}`)
      console.log()

      // Simulate negotiation turns
      const startOffer = buyerBudget * 75n / 100n // buyer starts at 75% of budget
      const sellerStart = sellerMin * 150n / 100n // seller starts at 150% of min

      let buyerOffer = startOffer
      let sellerOffer = sellerStart
      const turnResults: Array<{
        turn: number
        direction: string
        agent: string
        value: string
        deliveryDays: number
      }> = []

      for (let i = 1; i <= maxTurns; i++) {
        const isBuyerTurn = i % 2 === 1
        const agentId = isBuyerTurn ? buyer.did : seller.did
        const currentValue = isBuyerTurn ? buyerOffer : sellerOffer
        const deliveryDays = isBuyerTurn ? 60 - (i - 1) * 2 : 45 + (i - 1) * 2

        const proof = await prover.generateProof(CircuitId.MANDATE_BOUND, {
          value: currentValue,
          maxValue: isBuyerTurn ? buyerBudget : sellerMin * 2n,
        })

        sess.proposeTurn({
          agentId,
          terms: {
            value: currentValue,
            currency,
            deliveryDays,
          },
          proofType: CircuitId.MANDATE_BOUND,
          proof: proof.proof,
          publicSignals: proof.publicSignals,
        })

        const direction = isBuyerTurn ? symbols.arrow : symbols.arrowLeft
        const label = i === 1 ? 'Offer' : 'Counter'
        const padLabel = label.padEnd(8)
        console.log(
          `  Turn ${i} ${direction} ${padLabel} ${formatCurrency(currentValue, currency)} / ${deliveryDays} days`,
        )

        turnResults.push({
          turn: i,
          direction: isBuyerTurn ? 'out' : 'in',
          agent: isBuyerTurn ? 'buyer' : 'seller',
          value: currentValue.toString(),
          deliveryDays,
        })

        // Converge offers
        if (isBuyerTurn) {
          buyerOffer = buyerOffer + (sellerOffer - buyerOffer) / 3n
        } else {
          sellerOffer = sellerOffer - (sellerOffer - buyerOffer) / 3n
        }
      }

      // Step 5: Accept and commit
      const lastTurn = sess.turns[sess.turns.length - 1]!
      const acceptAgent = lastTurn.agentId === buyer.did ? seller.did : buyer.did
      sess.accept(acceptAgent)

      const agreedValue = lastTurn.terms.value
      const agreedDays = lastTurn.terms.deliveryDays

      console.log()
      console.log(`  ${symbols.success} ${chalk.bold('Agreement')}: ${formatCurrency(agreedValue, currency)} / ${agreedDays} days`)

      // Create commitment — use on-chain CommitmentManager if RPC configured
      const commitSpinner = ora(
        isLiveMode && options.rpcUrl
          ? 'Recording commitment on Arbitrum Sepolia...'
          : 'Recording commitment (local)...',
      ).start()

      const commitmentManager = (options.rpcUrl && contractAddresses)
        ? new CommitmentManager({
            rpcUrl: options.rpcUrl,
            contractAddress: contractAddresses.commitmentContract,
            privateKey: options.privateKey || process.env.DEPLOYER_PRIVATE_KEY,
          })
        : new CommitmentManager()

      const buyerCredHash = credManager.hashCredential(buyerCred)
      const sellerCredHash = credManager.hashCredential(sellerCred)

      const commitment = await commitmentManager.create({
        sessionId: sess.id,
        agreementHash: sess.merkleRoot,
        parties: [buyer.did, seller.did],
        credentialHashes: [buyerCredHash, sellerCredHash],
        proofs: [{
          circuitId: CircuitId.MANDATE_BOUND,
          circuitVersion: 'v1.0.0',
          proof: buyerProof.proof,
          publicSignals: buyerProof.publicSignals,
        }],
      })

      await commitmentManager.verify(commitment.id)

      if (commitment.txHash) {
        commitSpinner.succeed(`Commitment settled on-chain!`)
        printDetail('TX Hash', commitment.txHash)
        printDetail('Block', String(commitment.blockNumber))
      } else {
        commitSpinner.succeed('Commitment recorded and verified!')
      }
      printDetail('Commitment ID', commitment.id)
      printDetail('Merkle Root', sess.merkleRoot)

      // Summary
      console.log()
      console.log(chalk.gray('─'.repeat(40)))
      const modeLabel = isLiveMode ? 'LIVE' : 'LOCAL'
      console.log(
        chalk.gray(
          `  [${modeLabel}] Total turns: ${sess.turnCount} | ZK proofs: ${maxTurns + 3} | Proof overhead: ${proofMs}ms`,
        ),
      )
      console.log()

      if (options.json) {
        console.log()
        console.log(JSON.stringify({
          mode: isLiveMode ? 'live' : 'local',
          buyer: { did: buyer.did, budget: buyerBudget.toString() },
          seller: { did: seller.did, minPrice: sellerMin.toString() },
          session: {
            id: sess.id,
            status: sess.status,
            turnCount: sess.turnCount,
            merkleRoot: sess.merkleRoot,
          },
          agreement: {
            value: agreedValue.toString(),
            currency,
            deliveryDays: agreedDays,
          },
          commitment: {
            id: commitment.id,
            verified: commitment.verified,
            txHash: commitment.txHash ?? null,
            blockNumber: commitment.blockNumber ?? null,
          },
          turns: turnResults,
        }, null, 2))
      }
    })
}
