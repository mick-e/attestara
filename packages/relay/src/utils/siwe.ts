import { randomBytes } from 'crypto'
import { verifyMessage, getAddress } from 'ethers'

/**
 * In-memory nonce store with TTL support.
 * In production, replace with Redis.
 */
interface NonceEntry {
  address: string
  expiresAt: number
}

const nonceStore = new Map<string, NonceEntry>()

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a cryptographically random nonce (32 bytes hex).
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Store a nonce for a given wallet address with a 5-minute TTL.
 */
export function storeNonce(nonce: string, address: string): void {
  nonceStore.set(nonce, {
    address: address.toLowerCase(),
    expiresAt: Date.now() + NONCE_TTL_MS,
  })
}

/**
 * Consume a nonce — returns the associated address if valid, null if expired or missing.
 * Nonces are single-use: consumed on retrieval.
 */
export function consumeNonce(nonce: string): string | null {
  const entry = nonceStore.get(nonce)
  if (!entry) return null
  nonceStore.delete(nonce)
  if (Date.now() > entry.expiresAt) return null
  return entry.address
}

/**
 * Clear the nonce store (for testing).
 */
export function clearNonceStore(): void {
  nonceStore.clear()
}

/**
 * Expose the nonce store for testing (e.g., to manually expire entries).
 */
export function getNonceStore(): Map<string, NonceEntry> {
  return nonceStore
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
export function validateSiweMessage(
  message: string,
  options: ValidateSiweOptions,
): { ok: true; params: SiweMessageParams } | { ok: false; error: string } {
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
  const nonceAddress = consumeNonce(params.nonce)
  if (!nonceAddress) {
    return { ok: false, error: 'Invalid or expired nonce' }
  }

  // Verify the nonce was issued for this address
  if (nonceAddress !== params.address.toLowerCase()) {
    return { ok: false, error: 'Nonce address mismatch' }
  }

  return { ok: true, params }
}
