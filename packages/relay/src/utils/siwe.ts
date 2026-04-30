import { randomBytes } from 'crypto'
import { verifyMessage, getAddress } from 'ethers'
import { getRedis } from './redis.js'

const NONCE_PREFIX = 'siwe:nonce:'
const NONCE_TTL_SECONDS = 300

/**
 * Generate a cryptographically random nonce (32 bytes hex).
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Store a nonce for a given wallet address with a 300s TTL in Redis.
 */
export async function storeNonce(nonce: string, address: string): Promise<void> {
  const redis = getRedis()
  await redis.setex(`${NONCE_PREFIX}${nonce}`, NONCE_TTL_SECONDS, address.toLowerCase())
}

/**
 * Consume a nonce — returns the associated address if valid, null if missing.
 * Nonces are single-use: deleted from Redis on retrieval.
 */
export async function consumeNonce(nonce: string): Promise<string | null> {
  const redis = getRedis()
  const key = `${NONCE_PREFIX}${nonce}`
  const address = await redis.get(key)
  if (!address) return null
  await redis.del(key)
  return address
}

/**
 * Clear all SIWE nonces from Redis (for testing).
 */
export async function clearNonceStore(): Promise<void> {
  const redis = getRedis()
  let cursor = '0'
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${NONCE_PREFIX}*`, 'COUNT', 100)
    cursor = nextCursor
    if (keys.length > 0) await redis.del(...keys)
  } while (cursor !== '0')
}

export interface SiweMessageParams {
  domain: string
  address: string
  statement: string
  uri: string
  version: string
  chainId: number
  nonce: string
  issuedAt: string
}

/**
 * Construct an EIP-4361 compliant SIWE message string.
 *
 * Format:
 *   ${domain} wants you to sign in with your Ethereum account:
 *   ${address}
 *
 *   ${statement}
 *
 *   URI: ${uri}
 *   Version: ${version}
 *   Chain ID: ${chainId}
 *   Nonce: ${nonce}
 *   Issued At: ${issuedAt}
 */
export function createSiweMessage(params: SiweMessageParams): string {
  const { domain, address, statement, uri, version, chainId, nonce, issuedAt } = params
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

/**
 * Parse an EIP-4361 SIWE message string into its component fields.
 * Returns null if the message format is invalid.
 */
export function parseSiweMessage(message: string): SiweMessageParams | null {
  try {
    const lines = message.split('\n')
    if (lines.length < 10) return null

    const line0 = lines[0]
    const line1 = lines[1]
    const line3 = lines[3]
    const line5 = lines[5]
    const line6 = lines[6]
    const line7 = lines[7]
    const line8 = lines[8]
    const line9 = lines[9]
    if (
      line0 === undefined ||
      line1 === undefined ||
      line3 === undefined ||
      line5 === undefined ||
      line6 === undefined ||
      line7 === undefined ||
      line8 === undefined ||
      line9 === undefined
    ) {
      return null
    }

    const domainMatch = line0.match(/^(.+) wants you to sign in with your Ethereum account:$/)
    const domain = domainMatch?.[1]
    if (domain === undefined) return null

    const address = line1.trim()
    if (!address.startsWith('0x') || address.length !== 42) return null

    const statement = line3

    const uri = line5.match(/^URI: (.+)$/)?.[1]
    const version = line6.match(/^Version: (.+)$/)?.[1]
    const chainIdRaw = line7.match(/^Chain ID: (\d+)$/)?.[1]
    const nonce = line8.match(/^Nonce: (.+)$/)?.[1]
    const issuedAt = line9.match(/^Issued At: (.+)$/)?.[1]

    if (
      uri === undefined ||
      version === undefined ||
      chainIdRaw === undefined ||
      nonce === undefined ||
      issuedAt === undefined
    ) {
      return null
    }

    return {
      domain,
      address,
      statement,
      uri,
      version,
      chainId: parseInt(chainIdRaw, 10),
      nonce,
      issuedAt,
    }
  } catch (_err: unknown) {
    return null
  }
}

/**
 * Verify a SIWE signature using ethers.verifyMessage.
 * Returns the checksummed recovered address, or throws if verification fails.
 */
export function verifySiweSignature(message: string, signature: string): string {
  const recovered = verifyMessage(message, signature)
  return getAddress(recovered) // checksummed
}

export interface ValidateSiweOptions {
  expectedDomain: string
  expectedStatement?: string
}

/**
 * Validate a SIWE message:
 * - Parse the message
 * - Check domain matches
 * - Check statement matches (if provided)
 * - Check nonce is valid and not expired
 *
 * Returns the parsed params on success, or an error string on failure.
 */
export async function validateSiweMessage(
  message: string,
  options: ValidateSiweOptions,
): Promise<{ ok: true; params: SiweMessageParams } | { ok: false; error: string }> {
  const params = parseSiweMessage(message)
  if (!params) {
    return { ok: false, error: 'Invalid SIWE message format' }
  }

  if (params.domain !== options.expectedDomain) {
    return { ok: false, error: 'Domain mismatch' }
  }

  if (options.expectedStatement && params.statement !== options.expectedStatement) {
    return { ok: false, error: 'Statement mismatch' }
  }

  // Check nonce validity
  const nonceAddress = await consumeNonce(params.nonce)
  if (!nonceAddress) {
    return { ok: false, error: 'Invalid or expired nonce' }
  }

  // Verify the nonce was issued for this address
  if (nonceAddress !== params.address.toLowerCase()) {
    return { ok: false, error: 'Nonce address mismatch' }
  }

  return { ok: true, params }
}
