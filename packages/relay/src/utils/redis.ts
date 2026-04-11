import Redis from 'ioredis'
import { loadConfig } from '../config.js'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    const config = loadConfig()
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: false,
    })
    redis.on('error', (err) => {
      console.error('[redis] connection error:', err.message)
    })
  }
  return redis
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
