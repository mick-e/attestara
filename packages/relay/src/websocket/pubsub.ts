/**
 * Redis pub/sub adapter for horizontal WebSocket scaling.
 *
 * Each relay instance subscribes to Redis channels keyed by
 * `org:<orgId>:events` and `session:<sessionId>:events`.
 * When a broadcast is triggered, the event is published to Redis
 * and fanned out to local WebSocket connections on every instance.
 */

import type Redis from 'ioredis'
import * as sessionChannel from './session-channel.js'
import * as orgFeed from './org-feed.js'

export interface PubSubMessage {
  channel: string
  event: string
  data: unknown
  /** Originating instance ID to avoid double-delivery on the sender. */
  instanceId: string
}

export interface PubSubAdapter {
  /** Publish a broadcast event to Redis so other instances receive it. */
  publish(channel: string, event: string, data: unknown): Promise<void>
  /** Subscribe to a Redis channel and fan out to local WS connections. */
  subscribe(channel: string): Promise<void>
  /** Unsubscribe from a Redis channel. */
  unsubscribe(channel: string): Promise<void>
  /** Shut down pub and sub clients. */
  close(): Promise<void>
  /** Unique instance identifier. */
  readonly instanceId: string
}

/**
 * Converts a logical channel name (e.g. "org:abc123") to the
 * Redis channel key used for pub/sub.
 */
function toRedisChannel(channel: string): string {
  if (channel.startsWith('session:')) {
    const sessionId = channel.slice('session:'.length)
    return `session:${sessionId}:events`
  }
  if (channel.startsWith('org:')) {
    const orgId = channel.slice('org:'.length)
    return `org:${orgId}:events`
  }
  return channel
}

/**
 * Create a Redis-backed pub/sub adapter.
 *
 * @param redisFactory - A function that returns a Redis client.
 *   Typically `() => existingRedis.duplicate()` so that the subscriber
 *   connection is separate from the main connection (ioredis requirement).
 */
export function createPubSubAdapter(
  redisFactory: () => Redis,
  instanceId?: string,
): PubSubAdapter {
  const id = instanceId ?? crypto.randomUUID()

  // Separate connections for pub and sub (ioredis requires this)
  const pub = redisFactory()
  const sub = redisFactory()

  // Track subscribed Redis channels
  const subscribedChannels = new Set<string>()

  // Handle incoming messages from Redis
  sub.on('message', (redisChannel: string, raw: string) => {
    let msg: PubSubMessage
    try {
      msg = JSON.parse(raw) as PubSubMessage
    } catch (_err: unknown) {
      return // Ignore malformed messages
    }

    // Skip messages from this instance -- we already delivered locally
    if (msg.instanceId === id) return

    // Fan out to local WebSocket connections
    if (msg.channel.startsWith('session:')) {
      const sessionId = msg.channel.slice('session:'.length)
      sessionChannel.broadcast(sessionId, msg.event, msg.data)
    } else if (msg.channel.startsWith('org:')) {
      const orgId = msg.channel.slice('org:'.length)
      orgFeed.broadcast(orgId, msg.event, msg.data)
    }
  })

  return {
    instanceId: id,

    async publish(channel: string, event: string, data: unknown): Promise<void> {
      const redisChannel = toRedisChannel(channel)
      const message: PubSubMessage = { channel, event, data, instanceId: id }
      await pub.publish(redisChannel, JSON.stringify(message))
    },

    async subscribe(channel: string): Promise<void> {
      const redisChannel = toRedisChannel(channel)
      if (subscribedChannels.has(redisChannel)) return
      subscribedChannels.add(redisChannel)
      await sub.subscribe(redisChannel)
    },

    async unsubscribe(channel: string): Promise<void> {
      const redisChannel = toRedisChannel(channel)
      if (!subscribedChannels.has(redisChannel)) return
      subscribedChannels.delete(redisChannel)
      await sub.unsubscribe(redisChannel)
    },

    async close(): Promise<void> {
      if (subscribedChannels.size > 0) {
        await sub.unsubscribe(...subscribedChannels)
        subscribedChannels.clear()
      }
      await pub.quit()
      await sub.quit()
    },
  }
}
