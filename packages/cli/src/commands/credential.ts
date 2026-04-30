import { Command } from 'commander'
import ora from 'ora'
import { CredentialManager, MemoryIPFSClient } from '@attestara/sdk'
import type { MandateParams, AuthorityCredential } from '@attestara/types'
import { requireConfig, saveCredential, CREDENTIALS_DIR } from '../config.js'
import {
  printError,
  printDetail,
  printHeader,
  printJson,
  printTable,
  formatCurrency,
  formatDate,
  truncateId,
  statusColor,
  type TableColumn,
} from '../output.js'
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { promptIfMissing } from '../interactive.js'

export function credentialCommand(): Command {
  const credential = new Command('credential')
    .description('Manage authority credentials')
    .addHelpText('after', `
Examples:
  $ attestara credential issue --domain procurement.contracts --max-value 500000 --currency EUR
  $ attestara credential list
  $ attestara credential show <id>
  $ attestara credential revoke <id>
    `)

  credential
    .command('issue')
    .description('Issue a new Authority Credential')
    .option('--domain <domain>', 'Mandate domain (e.g., procurement.contracts)')
    .option('--max-value <value>', 'Maximum authorized value')
    .option('--currency <currency>', 'Currency code', 'EUR')
    .option('--floor <value>', 'Parameter floor value')
    .option('--ceiling <value>', 'Parameter ceiling value')
    .option('--expires <seconds>', 'Expiration in seconds', String(86400 * 30))
    .option('--json', 'Output as JSON')
    .action(async (options, cmd) => {
      // Prompt for missing required options in interactive mode
      options.domain = await promptIfMissing(cmd, options.domain, {
        message: 'Mandate domain (e.g., procurement.contracts):',
        validate: (v) => v.length > 0 || 'Domain is required',
      })
      options.maxValue = await promptIfMissing(cmd, options.maxValue, {
        message: 'Maximum authorized value:',
        validate: (v) => /^\d+$/.test(v) || 'Must be a positive integer',
      })

      if (!options.domain || !options.maxValue) {
        printError('Missing required options: --domain and --max-value')
        process.exitCode = 1
        return
      }

      const spinner = ora('Issuing credential...').start()

      try {
        const config = await requireConfig()
        const credManager = new CredentialManager(new MemoryIPFSClient())

        const mandate: MandateParams = {
          maxValue: BigInt(options.maxValue),
          currency: options.currency,
          domain: options.domain,
        }
        if (options.floor) mandate.parameterFloor = BigInt(options.floor)
        if (options.ceiling) mandate.parameterCeiling = BigInt(options.ceiling)

        const cred = await credManager.issue(config.agent.did, mandate, {
          expiresInSeconds: parseInt(options.expires, 10),
        })

        // Save credential to file
        const filename = `${cred.id.replace(/[^a-zA-Z0-9-]/g, '_')}.vc.json`
        const filePath = await saveCredential(filename, cred)

        spinner.succeed('Credential issued!')

        if (options.json) {
          printJson(cred)
        } else {
          printDetail('Credential ID', cred.id)
          printDetail('Issuer', cred.issuer)
          printDetail('Domain', mandate.domain)
          printDetail('Max Value', formatCurrency(mandate.maxValue, mandate.currency))
          printDetail('Issued', formatDate(cred.issuanceDate))
          printDetail('Expires', formatDate(cred.expirationDate))
          printDetail('Saved to', filePath)
        }
      } catch (error) {
        spinner.fail('Failed to issue credential')
        throw error
      }
    })

  credential
    .command('revoke')
    .description('Revoke a credential')
    .argument('<id>', 'Credential ID or filename')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const spinner = ora('Revoking credential...').start()

      try {
        const cred = await findCredential(id)
        if (!cred) {
          spinner.fail(`Credential not found: ${id}`)
          process.exitCode = 1
          return
        }

        const credManager = new CredentialManager(new MemoryIPFSClient())
        const hash = credManager.hashCredential(cred)
        await credManager.revoke(hash)

        spinner.succeed('Credential revoked!')

        if (options.json) {
          printJson({ id: cred.id, hash, status: 'revoked' })
        } else {
          printDetail('Credential ID', cred.id)
          printDetail('Hash', hash.slice(0, 16) + '...')
          printDetail('Status', statusColor('revoked'))
        }
      } catch (error) {
        spinner.fail('Failed to revoke credential')
        throw error
      }
    })

  credential
    .command('list')
    .description('List credentials')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const creds = await loadAllCredentials()

        if (options.json) {
          printJson(creds)
          return
        }

        printHeader('Credentials')

        const columns: TableColumn[] = [
          { header: 'ID', key: 'id', width: 20, format: (v) => truncateId(String(v), 20) },
          { header: 'Domain', key: 'domain', width: 24 },
          { header: 'Max Value', key: 'maxValue', width: 16 },
          { header: 'Expires', key: 'expires', width: 20 },
          { header: 'Status', key: 'status', width: 10, format: (v) => statusColor(String(v)) },
        ]

        const rows = creds.map((c) => ({
          id: c.id,
          domain: c.credentialSubject.mandateParams.domain,
          maxValue: formatCurrency(
            c.credentialSubject.mandateParams.maxValue,
            c.credentialSubject.mandateParams.currency,
          ),
          expires: formatDate(c.expirationDate),
          status: new Date(c.expirationDate) < new Date() ? 'expired' : 'valid',
        }))

        printTable(columns, rows)
      } catch (error) {
        printError((error as Error).message)
        process.exitCode = 1
      }
    })

  credential
    .command('show')
    .description('Show credential details')
    .argument('<id>', 'Credential ID or filename')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      try {
        const cred = await findCredential(id)
        if (!cred) {
          printError(`Credential not found: ${id}`)
          process.exitCode = 1
          return
        }

        if (options.json) {
          printJson(cred)
          return
        }

        const mp = cred.credentialSubject.mandateParams
        const isExpired = new Date(cred.expirationDate) < new Date()

        printHeader('Credential Details')
        printDetail('ID', cred.id)
        printDetail('Type', cred.type.join(', '))
        printDetail('Issuer', cred.issuer)
        printDetail('Subject', cred.credentialSubject.id)
        printDetail('Domain', mp.domain)
        printDetail('Max Value', formatCurrency(mp.maxValue, mp.currency))
        printDetail('Currency', mp.currency)
        if (mp.parameterFloor !== undefined) {
          printDetail('Floor', formatCurrency(mp.parameterFloor, mp.currency))
        }
        if (mp.parameterCeiling !== undefined) {
          printDetail('Ceiling', formatCurrency(mp.parameterCeiling, mp.currency))
        }
        printDetail('Issued', formatDate(cred.issuanceDate))
        printDetail('Expires', formatDate(cred.expirationDate))
        printDetail('Status', statusColor(isExpired ? 'expired' : 'valid'))
        printDetail('Proof Type', cred.proof.type)
        printDetail('Proof Purpose', cred.proof.proofPurpose)
      } catch (error) {
        printError((error as Error).message)
        process.exitCode = 1
      }
    })

  return credential
}

// ── Helpers ──────────────────────────────────────────────────────────

async function loadAllCredentials(): Promise<AuthorityCredential[]> {
  if (!existsSync(CREDENTIALS_DIR)) return []
  const files = readdirSync(CREDENTIALS_DIR).filter((f) => f.endsWith('.vc.json'))
  const creds: AuthorityCredential[] = []
  for (const file of files) {
    try {
      const raw = await readFile(join(CREDENTIALS_DIR, file), 'utf-8')
      const data = JSON.parse(raw)
      // Restore bigint fields
      if (data.credentialSubject?.mandateParams) {
        const mp = data.credentialSubject.mandateParams
        mp.maxValue = BigInt(mp.maxValue)
        if (mp.parameterFloor !== undefined && mp.parameterFloor !== null) {
          mp.parameterFloor = BigInt(mp.parameterFloor)
        }
        if (mp.parameterCeiling !== undefined && mp.parameterCeiling !== null) {
          mp.parameterCeiling = BigInt(mp.parameterCeiling)
        }
      }
      creds.push(data as AuthorityCredential)
    } catch (_err: unknown) {
      // Skip invalid credential files during enumeration
    }
  }
  return creds
}

async function findCredential(idOrFile: string): Promise<AuthorityCredential | null> {
  const creds = await loadAllCredentials()

  // Match by exact ID
  const byId = creds.find((c) => c.id === idOrFile)
  if (byId) return byId

  // Match by partial ID
  const byPartial = creds.find((c) => c.id.includes(idOrFile))
  if (byPartial) return byPartial

  // Try loading directly as a file path
  const paths = [
    idOrFile,
    join(CREDENTIALS_DIR, idOrFile),
    join(CREDENTIALS_DIR, `${idOrFile}.vc.json`),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, 'utf-8')
        const data = JSON.parse(raw)
        if (data.credentialSubject?.mandateParams) {
          const mp = data.credentialSubject.mandateParams
          mp.maxValue = BigInt(mp.maxValue)
          if (mp.parameterFloor !== undefined && mp.parameterFloor !== null) mp.parameterFloor = BigInt(mp.parameterFloor)
          if (mp.parameterCeiling !== undefined && mp.parameterCeiling !== null) mp.parameterCeiling = BigInt(mp.parameterCeiling)
        }
        return data as AuthorityCredential
      } catch (_err: unknown) {
        continue
      }
    }
  }

  return null
}
