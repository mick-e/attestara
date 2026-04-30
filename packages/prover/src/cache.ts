import { createHash } from 'crypto'
import type { ProofResult } from '@attestara/types'

export interface CacheClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode: string, ttl: number): Promise<unknown>
  ping(): Promise<string>
  quit(): Promise<unknown>
}

export interface ProverCache {
  getProof(circuitId: string, inputs: Record<string, unknown>): Promise<ProofResult | null>
  setProof(circuitId: string, inputs: Record<string, unknown>, result: ProofResult, ttlSeconds?: number): Promise<void>
  getVerificationKey(circuitId: string): Promise<Record<string, unknown> | null>
  setVerificationKey(circuitId: string, vkey: Record<string, unknown>): Promise<void>
  isConnected(): boolean
  close(): Promise<void>
}

const DEFAULT_PROOF_TTL = 3600 // 1 hour
const VKEY_TTL = 86400 // 24 hours

function computeInputHash(circuitId: string, inputs: Record<string, unknown>): string {
  const sorted = JSON.stringify(inputs, Object.keys(inputs).sort())
  return createHash('sha256').update(`${circuitId}:${sorted}`).digest('hex')
}

export class RedisProverCache implements ProverCache {
  private connected = false

  constructor(private redis: CacheClient) {
    this.connected = true
  }

  static async create(redisUrl: string): Promise<RedisProverCache | null> {
    try {
      const { default: Redis } = await import('ioredis')
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null
          return Math.min(times * 200, 2000)
        },
        lazyConnect: true,
      })
      await redis.connect()
      await redis.ping()
      return new RedisProverCache(redis as unknown as CacheClient)
    } catch (err: unknown) {
      console.warn('[ProverCache] Redis connection failed, falling back to in-memory cache', err)
      return null
    }
  }

  async getProof(circuitId: string, inputs: Record<string, unknown>): Promise<ProofResult | null> {
    if (!this.connected) return null
    try {
      const key = `proof:${computeInputHash(circuitId, inputs)}`
      const cached = await this.redis.get(key)
      if (!cached) return null
      return JSON.parse(cached) as ProofResult
    } catch (err: unknown) {
      console.warn('[ProverCache] Failed to read proof from cache', err)
      return null
    }
  }

  async setProof(circuitId: string, inputs: Record<string, unknown>, result: ProofResult, ttlSeconds = DEFAULT_PROOF_TTL): Promise<void> {
    if (!this.connected) return
    try {
      const key = `proof:${computeInputHash(circuitId, inputs)}`
      await this.redis.set(key, JSON.stringify(result), 'EX', ttlSeconds)
    } catch (err: unknown) {
      console.warn('[ProverCache] Failed to write proof to cache', err)
    }
  }

  async getVerificationKey(circuitId: string): Promise<Record<string, unknown> | null> {
    if (!this.connected) return null
    try {
      const key = `vkey:${circuitId}`
      const cached = await this.redis.get(key)
      if (!cached) return null
      return JSON.parse(cached) as Record<string, unknown>
    } catch (err: unknown) {
      console.warn('[ProverCache] Failed to read verification key from cache', err)
      return null
    }
  }

  async setVerificationKey(circuitId: string, vkey: Record<string, unknown>): Promise<void> {
    if (!this.connected) return
    try {
      const key = `vkey:${circuitId}`
      await this.redis.set(key, JSON.stringify(vkey), 'EX', VKEY_TTL)
    } catch (err: unknown) {
      console.warn('[ProverCache] Failed to write verification key to cache', err)
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  async close(): Promise<void> {
    if (this.connected) {
      this.connected = false
      try {
        await this.redis.quit()
      } catch (err: unknown) {
        console.warn('[ProverCache] Error closing Redis connection', err)
      }
    }
  }
}

/** In-memory fallback cache for when Redis is unavailable */
export class InMemoryProverCache implements ProverCache {
  private proofs = new Map<string, { result: ProofResult; expiresAt: number }>()
  private vkeys = new Map<string, Record<string, unknown>>()

  async getProof(circuitId: string, inputs: Record<string, unknown>): Promise<ProofResult | null> {
    const key = computeInputHash(circuitId, inputs)
    const entry = this.proofs.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.proofs.delete(key)
      return null
    }
    return entry.result
  }

  async setProof(circuitId: string, inputs: Record<string, unknown>, result: ProofResult, ttlSeconds = DEFAULT_PROOF_TTL): Promise<void> {
    const key = computeInputHash(circuitId, inputs)
    this.proofs.set(key, { result, expiresAt: Date.now() + ttlSeconds * 1000 })
    // Evict old entries if cache grows too large
    if (this.proofs.size > 10_000) {
      const now = Date.now()
      for (const [k, v] of this.proofs) {
        if (now > v.expiresAt) this.proofs.delete(k)
      }
    }
  }

  async getVerificationKey(circuitId: string): Promise<Record<string, unknown> | null> {
    return this.vkeys.get(circuitId) ?? null
  }

  async setVerificationKey(circuitId: string, vkey: Record<string, unknown>): Promise<void> {
    this.vkeys.set(circuitId, vkey)
  }

  isConnected(): boolean {
    return true
  }

  async close(): Promise<void> {
    this.proofs.clear()
    this.vkeys.clear()
  }
}
