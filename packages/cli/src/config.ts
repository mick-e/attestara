import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { AttestaraConfig } from '@attestara/types'

const CONFIG_DIR = join(homedir(), '.attestara')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
const KEYS_DIR = join(CONFIG_DIR, 'keys')
const CREDENTIALS_DIR = join(CONFIG_DIR, 'credentials')

export { CONFIG_DIR, CONFIG_FILE, KEYS_DIR, CREDENTIALS_DIR }

/**
 * Default config for local development / testnet.
 */
export function defaultConfig(did: string): AttestaraConfig {
  return {
    agent: {
      did,
      keyFile: join(KEYS_DIR, 'agent.json'),
      credentialFile: join(CREDENTIALS_DIR, 'authority.vc.json'),
    },
    network: {
      chain: 'arbitrum-sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      contracts: {
        agentRegistry: '0x18fDE761a217A91Be8bD3A35fA285dCc7307B808',
        credentialRegistry: '0xB29a580fd2c7D72Ff0e49DF595F9B63837E0Ec86',
        commitmentContract: '0x8f6a1496314B76464e36ee5c04ebDd270f9AF6f8',
      },
    },
    prover: {
      mode: 'local',
    },
  }
}

/**
 * Ensure the config directory structure exists.
 */
export async function ensureConfigDirs(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true })
  await mkdir(KEYS_DIR, { recursive: true })
  await mkdir(CREDENTIALS_DIR, { recursive: true })
}

/**
 * Load the Attestara config from ~/.attestara/config.json.
 * Returns null if the config file does not exist.
 */
export async function loadConfig(): Promise<AttestaraConfig | null> {
  if (!existsSync(CONFIG_FILE)) {
    return null
  }
  const raw = await readFile(CONFIG_FILE, 'utf-8')
  return JSON.parse(raw) as AttestaraConfig
}

/**
 * Load config or throw with a helpful message.
 */
export async function requireConfig(): Promise<AttestaraConfig> {
  const config = await loadConfig()
  if (!config) {
    throw new Error(
      `No Attestara config found. Run 'attestara init' first.\n` +
      `  Expected config at: ${CONFIG_FILE}`,
    )
  }
  return config
}

/**
 * Save config to ~/.attestara/config.json.
 */
export async function saveConfig(config: AttestaraConfig): Promise<void> {
  await ensureConfigDirs()
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Check whether a config file already exists.
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE)
}

/**
 * Save a credential JSON file to the credentials directory.
 */
export async function saveCredential(filename: string, credential: unknown): Promise<string> {
  await ensureConfigDirs()
  const filePath = join(CREDENTIALS_DIR, filename)
  const replacer = (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value
  await writeFile(filePath, JSON.stringify(credential, replacer, 2), 'utf-8')
  return filePath
}

/**
 * Save key data to the keys directory.
 */
export async function saveKey(filename: string, keyData: unknown): Promise<string> {
  await ensureConfigDirs()
  const filePath = join(KEYS_DIR, filename)
  await writeFile(filePath, JSON.stringify(keyData, null, 2), 'utf-8')
  return filePath
}
