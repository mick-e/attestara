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

    // Line 0: "{domain} wants you to sign in with your Ethereum account:"
    const domainMatch = lines[0].match(/^(.+) wants you to sign in with your Ethereum account:$/)
    if (!domainMatch) return null
    const domain = domainMatch[1]

    // Line 1: address
    const address = lines[1].trim()
    if (!address.startsWith('0x') || address.length !== 42) return null

    // Line 2: empty
    // Line 3: statement
    const statement = lines[3]

    // Line 4: empty
    // Lines 5-9: structured fields
    const uriMatch = lines[5].match(/^URI: (.+)$/)
    const versionMatch = lines[6].match(/^Version: (.+)$/)
    const chainIdMatch = lines[7].match(/^Chain ID: (\d+)$/)
    const nonceMatch = lines[8].match(/^Nonce: (.+)$/)
    const issuedAtMatch = lines[9].match(/^Issued At: (.+)$/)

    if (!uriMatch || !versionMatch || !chainIdMatch || !nonceMatch || !issuedAtMatch) {
      return null
    }

    return {
      domain,
      address,
      statement,
      uri: uriMatch[1],
      version: versionMatch[1],
      chainId: parseInt(chainIdMatch[1], 10),
      nonce: nonceMatch[1],
      issuedAt: issuedAtMatch[1],
    }
  } catch {
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
