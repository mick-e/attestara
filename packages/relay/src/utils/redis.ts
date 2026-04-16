import Redis from 'ioredis'
import { loadConfig } from '../config.js'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis) {
    const config = loadConfig()
    redis = new Redis(config.REDIS_URL, {
      // Connection pool tuning
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 5) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: false,
      // Keep-alive to avoid idle connection drops behind load balancers
      keepAlive: 30_000,
      connectTimeout: 10_000,
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
