import { describe, it, expect, beforeEach } from 'vitest'
import { createPubSubAdapter } from '../src/websocket/pubsub.js'
import {
  subscribe as sessionSubscribe,
  clearSessionChannels,
} from '../src/websocket/session-channel.js'
import {
  subscribe as orgSubscribe,
  clearOrgFeeds,
} from '../src/websocket/org-feed.js'
import { broadcast, setPubSubAdapter, getPubSubAdapter } from '../src/websocket/index.js'

// -- Mock ioredis ---------------------------------------------------------------

type MessageHandler = (channel: string, message: string) => void

/** Creates a minimal mock Redis hub that simulates pub/sub across clients. */
function createMockRedisHub() {
  const listeners = new Map<string, Set<MessageHandler>>()

  function createClient() {
    const localHandlers = new Map<string, MessageHandler>()
    let messageCallback: MessageHandler | null = null

    return {
      async subscribe(...channels: string[]) {
        for (const ch of channels) {
          const handler: MessageHandler = (redisCh, msg) => {
            if (redisCh === ch && messageCallback) {
              messageCallback(redisCh, msg)
            }
          }
          localHandlers.set(ch, handler)
          let set = listeners.get(ch)
          if (!set) {
            set = new Set()
            listeners.set(ch, set)
          }
          set.add(handler)
        }
      },

      async unsubscribe(...channels: string[]) {
        for (const ch of channels) {
          const handler = localHandlers.get(ch)
          if (handler) {
            listeners.get(ch)?.delete(handler)
            localHandlers.delete(ch)
          }
        }
      },

      async publish(channel: string, message: string) {
        const set = listeners.get(channel)
        if (set) {
          for (const handler of set) {
            handler(channel, message)
          }
        }
        return set?.size ?? 0
      },

      on(event: string, handler: MessageHandler) {
        if (event === 'message') {
          messageCallback = handler
        }
        return this
      },

      async quit() {
        for (const [ch, handler] of localHandlers) {
          listeners.get(ch)?.delete(handler)
        }
        localHandlers.clear()
        messageCallback = null
      },
    }
  }

  return { createClient, listeners }
}

// -- Helpers -------------------------------------------------------------------

function makeMockWs(readyState = 1) {
  const messages: string[] = []
  return {
    readyState,
    messages,
    send(data: string) {
      this.messages.push(data)
    },
  }
}

// -- Tests ---------------------------------------------------------------------

describe('PubSubAdapter', () => {
  beforeEach(() => {
    clearSessionChannels()
    clearOrgFeeds()
    setPubSubAdapter(null)
  })

  it('two instances sharing Redis: broadcast on A reaches B', async () => {
    const hub = createMockRedisHub()

    const adapterA = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-a',
    )
    const adapterB = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-b',
    )

    // Instance B subscribes to an org channel via Redis
    await adapterB.subscribe('org:org-1')

    // Instance B has a local WS subscriber
    const wsB = makeMockWs()
    orgSubscribe('org-1', wsB)

    // Instance A publishes an event
    await adapterA.publish('org:org-1', 'agent.created', { agentId: 'a1' })

    // Instance B's local WS should receive the event via Redis fan-out
    expect(wsB.messages).toHaveLength(1)
    const msg = JSON.parse(wsB.messages[0]!)
    expect(msg.channel).toBe('org:org-1')
    expect(msg.event).toBe('agent.created')
    expect(msg.data.agentId).toBe('a1')

    await adapterA.close()
    await adapterB.close()
  })

  it('messages from same instance are skipped (no double delivery)', async () => {
    const hub = createMockRedisHub()

    const adapter = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-a',
    )

    await adapter.subscribe('session:sess-1')

    const ws = makeMockWs()
    sessionSubscribe('sess-1', ws)

    // Publish from the same instance -- the sub handler should ignore it
    await adapter.publish('session:sess-1', 'turn.added', { turnId: 't1' })

    expect(ws.messages).toHaveLength(0)

    await adapter.close()
  })

  it('session channel events are fanned out correctly', async () => {
    const hub = createMockRedisHub()

    const adapterA = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-a',
    )
    const adapterB = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-b',
    )

    await adapterB.subscribe('session:sess-42')

    const wsB = makeMockWs()
    sessionSubscribe('sess-42', wsB)

    await adapterA.publish('session:sess-42', 'status.changed', { status: 'completed' })

    expect(wsB.messages).toHaveLength(1)
    const msg = JSON.parse(wsB.messages[0]!)
    expect(msg.channel).toBe('session:sess-42')
    expect(msg.event).toBe('status.changed')

    await adapterA.close()
    await adapterB.close()
  })

  it('unsubscribe stops receiving messages', async () => {
    const hub = createMockRedisHub()

    const adapterA = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-a',
    )
    const adapterB = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-b',
    )

    await adapterB.subscribe('org:org-2')
    await adapterB.unsubscribe('org:org-2')

    const ws = makeMockWs()
    orgSubscribe('org-2', ws)

    await adapterA.publish('org:org-2', 'event', {})

    expect(ws.messages).toHaveLength(0)

    await adapterA.close()
    await adapterB.close()
  })

  it('broadcast() integrates with pubsub adapter', async () => {
    const hub = createMockRedisHub()

    const adapter = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-a',
    )
    setPubSubAdapter(adapter)

    expect(getPubSubAdapter()).toBe(adapter)

    // Local WS subscriber
    const ws = makeMockWs()
    orgSubscribe('org-3', ws)

    // broadcast() should deliver locally AND publish to Redis
    broadcast('org:org-3', 'cred.issued', { id: 'c1' })

    // Local delivery is synchronous
    expect(ws.messages).toHaveLength(1)

    setPubSubAdapter(null)
    await adapter.close()
  })

  it('close() cleans up all subscriptions', async () => {
    const hub = createMockRedisHub()

    const adapter = createPubSubAdapter(
      () => hub.createClient() as any,
      'instance-x',
    )

    await adapter.subscribe('org:org-1')
    await adapter.subscribe('session:sess-1')
    await adapter.close()

    // After close, no listeners should remain
    const orgListeners = hub.listeners.get('org:org-1:events')
    const sessListeners = hub.listeners.get('session:sess-1:events')
    expect(orgListeners?.size ?? 0).toBe(0)
    expect(sessListeners?.size ?? 0).toBe(0)
  })
})
