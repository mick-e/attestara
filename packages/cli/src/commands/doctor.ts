import { Command } from 'commander'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { loadConfig, CONFIG_FILE, KEYS_DIR, CREDENTIALS_DIR } from '../config.js'
import { printHeader, printJson } from '../output.js'

interface CheckResult {
  name: string
  status: 'ok' | 'warn' | 'fail'
  detail: string
  remediation?: string
}

const PASS = chalk.green('\u2713')
const WARN = chalk.yellow('!')
const FAIL = chalk.red('\u2717')

function statusIcon(status: CheckResult['status']): string {
  switch (status) {
    case 'ok': return PASS
    case 'warn': return WARN
    case 'fail': return FAIL
  }
}

function statusLabel(status: CheckResult['status']): string {
  switch (status) {
    case 'ok': return chalk.green('OK')
    case 'warn': return chalk.yellow('WARN')
    case 'fail': return chalk.red('FAIL')
  }
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10)
  if (major >= 20) {
    return { name: 'Node.js version', status: 'ok', detail: version }
  }
  if (major >= 18) {
    return {
      name: 'Node.js version',
      status: 'warn',
      detail: `${version} (recommended: 20+)`,
      remediation: 'Upgrade to Node.js 20+ for best compatibility',
    }
  }
  return {
    name: 'Node.js version',
    status: 'fail',
    detail: `${version} (required: 20+)`,
    remediation: 'Install Node.js 20+ from https://nodejs.org',
  }
}

async function checkConfig(): Promise<CheckResult> {
  const config = await loadConfig()
  if (!config) {
    return {
      name: 'Attestara config',
      status: 'fail',
      detail: `Not found at ${CONFIG_FILE}`,
      remediation: 'Run: attestara init',
    }
  }
  return { name: 'Attestara config', status: 'ok', detail: CONFIG_FILE }
}

async function checkKeystore(): Promise<CheckResult> {
  if (!existsSync(KEYS_DIR)) {
    return {
      name: 'Keystore directory',
      status: 'fail',
      detail: `Missing: ${KEYS_DIR}`,
      remediation: 'Run: attestara init',
    }
  }
  const agentKey = join(KEYS_DIR, 'agent.json')
  if (!existsSync(agentKey)) {
    return {
      name: 'Keystore directory',
      status: 'warn',
      detail: `Directory exists but no agent.json found`,
      remediation: 'Run: attestara identity create',
    }
  }
  return { name: 'Keystore directory', status: 'ok', detail: KEYS_DIR }
}

async function checkCredentials(): Promise<CheckResult> {
  if (!existsSync(CREDENTIALS_DIR)) {
    return {
      name: 'Credentials directory',
      status: 'warn',
      detail: `Missing: ${CREDENTIALS_DIR}`,
      remediation: 'Run: attestara credential issue --domain <domain> --max-value <value>',
    }
  }
  return { name: 'Credentials directory', status: 'ok', detail: CREDENTIALS_DIR }
}

async function checkRelayReachable(): Promise<CheckResult> {
  const config = await loadConfig()
  const baseUrl = config?.relay?.url ?? 'http://localhost:3001'
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      return { name: 'Relay server', status: 'ok', detail: `${baseUrl} (healthy)` }
    }
    return {
      name: 'Relay server',
      status: 'warn',
      detail: `${baseUrl} responded with ${res.status}`,
      remediation: 'Check relay server logs',
    }
  } catch {
    return {
      name: 'Relay server',
      status: 'warn',
      detail: `${baseUrl} unreachable`,
      remediation: `Start the relay: cd packages/relay && pnpm dev`,
    }
  }
}

async function checkProverReachable(): Promise<CheckResult> {
  const config = await loadConfig()
  const baseUrl = config?.prover?.remoteUrl ?? 'http://localhost:3002'
  const mode = config?.prover?.mode ?? 'local'

  if (mode === 'local') {
    return { name: 'Prover service', status: 'ok', detail: `Local mode (no remote server needed)` }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) {
      return { name: 'Prover service', status: 'ok', detail: `${baseUrl} (healthy)` }
    }
    return {
      name: 'Prover service',
      status: 'warn',
      detail: `${baseUrl} responded with ${res.status}`,
      remediation: 'Check prover server logs',
    }
  } catch {
    return {
      name: 'Prover service',
      status: 'warn',
      detail: `${baseUrl} unreachable`,
      remediation: `Start the prover: cd packages/prover && pnpm dev`,
    }
  }
}

async function checkChainRpc(): Promise<CheckResult> {
  const config = await loadConfig()
  const rpcUrl = config?.network?.rpcUrl
  if (!rpcUrl) {
    return {
      name: 'Chain RPC',
      status: 'warn',
      detail: 'No RPC URL configured',
      remediation: 'Set network.rpcUrl in config',
    }
  }
  const url = Array.isArray(rpcUrl) ? (rpcUrl[0] ?? rpcUrl.join(',')) : rpcUrl
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json() as { result?: string }
      const blockNum = data.result ? parseInt(data.result, 16) : 'unknown'
      return { name: 'Chain RPC', status: 'ok', detail: `${url} (block ${blockNum})` }
    }
    return {
      name: 'Chain RPC',
      status: 'warn',
      detail: `${url} responded with ${res.status}`,
      remediation: 'Check RPC endpoint availability',
    }
  } catch {
    return {
      name: 'Chain RPC',
      status: 'warn',
      detail: `${url} unreachable`,
      remediation: 'Verify RPC URL and network connectivity',
    }
  }
}

async function checkContractsFile(): Promise<CheckResult> {
  const config = await loadConfig()
  const chain = config?.network?.chain ?? 'arbitrum-sepolia'
  const deploymentsPath = join(
    homedir(),
    '.attestara',
    `deployments.${chain}.json`,
  )
  // Also check workspace path
  const workspacePath = join(process.cwd(), 'packages', 'contracts', `deployments.${chain}.json`)

  if (existsSync(workspacePath)) {
    return { name: 'Contract deployments', status: 'ok', detail: workspacePath }
  }
  if (existsSync(deploymentsPath)) {
    return { name: 'Contract deployments', status: 'ok', detail: deploymentsPath }
  }
  return {
    name: 'Contract deployments',
    status: 'warn',
    detail: `No deployments file for ${chain}`,
    remediation: 'Deploy contracts: cd packages/contracts && npx hardhat deploy',
  }
}

export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Check Attestara configuration and connectivity')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const checks: CheckResult[] = []

      checks.push(await checkNodeVersion())
      checks.push(await checkConfig())
      checks.push(await checkKeystore())
      checks.push(await checkCredentials())
      checks.push(await checkContractsFile())
      checks.push(await checkRelayReachable())
      checks.push(await checkProverReachable())
      checks.push(await checkChainRpc())

      if (options.json) {
        printJson(checks)
        return
      }

      printHeader('Attestara Doctor')

      // Table
      const nameWidth = 24
      const statusWidth = 8
      console.log(
        chalk.bold('  Check'.padEnd(nameWidth)) +
        chalk.bold('Status'.padEnd(statusWidth)) +
        chalk.bold('Detail'),
      )
      console.log(chalk.gray('  ' + '\u2500'.repeat(70)))

      for (const check of checks) {
        const icon = statusIcon(check.status)
        const label = statusLabel(check.status).padEnd(statusWidth)
        console.log(`  ${icon} ${check.name.padEnd(nameWidth - 4)}${label}${chalk.gray(check.detail)}`)
      }

      // Remediation hints
      const issues = checks.filter((c) => c.status !== 'ok' && c.remediation)
      if (issues.length > 0) {
        console.log()
        console.log(chalk.bold('Recommendations:'))
        for (const issue of issues) {
          const icon = issue.status === 'fail' ? FAIL : WARN
          console.log(`  ${icon} ${chalk.white(issue.name)}: ${issue.remediation}`)
        }
      }

      // Summary
      const passed = checks.filter((c) => c.status === 'ok').length
      const warnings = checks.filter((c) => c.status === 'warn').length
      const failures = checks.filter((c) => c.status === 'fail').length

      console.log()
      if (failures === 0 && warnings === 0) {
        console.log(chalk.green(`${PASS} All ${passed} checks passed`))
      } else {
        console.log(
          `${PASS} ${chalk.green(`${passed} passed`)}` +
          (warnings > 0 ? `  ${WARN} ${chalk.yellow(`${warnings} warnings`)}` : '') +
          (failures > 0 ? `  ${FAIL} ${chalk.red(`${failures} failures`)}` : ''),
        )
      }

      if (failures > 0) process.exitCode = 1
    })
}
