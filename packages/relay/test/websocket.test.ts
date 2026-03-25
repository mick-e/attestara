import { describe, it, expect, beforeEach } from 'vitest'
import {
  subscribe as sessionSubscribe,
  unsubscribe as sessionUnsubscribe,
  broadcast as sessionBroadcast,
  cleanup as sessionCleanup,
  clearSessionChannels,
} from '../src/websocket/session-channel.js'
import {
  subscribe as orgSubscribe,
  unsubscribe as orgUnsubscribe,
  broadcast as orgBroadcast,
  cleanup as orgCleanup,
  clearOrgFeeds,
} from '../src/websocket/org-feed.js'
import {
  setOnline,
  setOffline,
  isOnline,
  getOnlineAgents,
  cleanupPresence,
  clearPresence,
} from '../src/websocket/presence.js'
import { broadcast } from '../src/websocket/index.js'

// Minimal WebSocket mock — only needs send() and readyState
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

// ─── SessionChannel ───────────────────────────────────────────────────────────

describe('SessionChannel', () => {
  beforeEach(() => {
    clearSessionChannels()
  })

  it('subscribe and broadcast reaches the subscriber', () => {
    const ws = makeMockWs()
    sessionSubscribe('sess-1', ws)
    sessionBroadcast('sess-1', 'turn.added', { turnId: 't1' })
    expect(ws.messages).toHaveLength(1)
    const msg = JSON.parse(ws.messages[0]!)
    expect(msg.channel).toBe('session:sess-1')
    expect(msg.event).toBe('turn.added')
    expect(msg.data.turnId).toBe('t1')
  })

  it('broadcast reaches multiple subscribers', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    sessionSubscribe('sess-1', ws1)
    sessionSubscribe('sess-1', ws2)
    sessionBroadcast('sess-1', 'status.changed', { status: 'active' })
    expect(ws1.messages).toHaveLength(1)
    expect(ws2.messages).toHaveLength(1)
  })

  it('broadcast does not reach closed connections', () => {
    const ws = makeMockWs(3) // 3 = CLOSED
    sessionSubscribe('sess-1', ws)
    sessionBroadcast('sess-1', 'turn.added', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('unsubscribe stops delivery', () => {
    const ws = makeMockWs()
    sessionSubscribe('sess-1', ws)
    sessionUnsubscribe('sess-1', ws)
    sessionBroadcast('sess-1', 'turn.added', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('unsubscribe of unknown session is a no-op', () => {
    const ws = makeMockWs()
    expect(() => sessionUnsubscribe('nonexistent', ws)).not.toThrow()
  })

  it('broadcast to unknown session is a no-op', () => {
    expect(() => sessionBroadcast('nonexistent', 'event', {})).not.toThrow()
  })

  it('cleanup removes ws from all sessions', () => {
    const ws = makeMockWs()
    sessionSubscribe('sess-1', ws)
    sessionSubscribe('sess-2', ws)
    sessionCleanup(ws)
    sessionBroadcast('sess-1', 'turn.added', {})
    sessionBroadcast('sess-2', 'turn.added', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('cleanup does not affect other subscribers on the same session', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    sessionSubscribe('sess-1', ws1)
    sessionSubscribe('sess-1', ws2)
    sessionCleanup(ws1)
    sessionBroadcast('sess-1', 'turn.added', {})
    expect(ws1.messages).toHaveLength(0)
    expect(ws2.messages).toHaveLength(1)
  })
})

// ─── OrgFeed ──────────────────────────────────────────────────────────────────

describe('OrgFeed', () => {
  beforeEach(() => {
    clearOrgFeeds()
  })

  it('subscribe and broadcast reaches the subscriber', () => {
    const ws = makeMockWs()
    orgSubscribe('org-1', ws)
    orgBroadcast('org-1', 'agent.created', { agentId: 'a1' })
    expect(ws.messages).toHaveLength(1)
    const msg = JSON.parse(ws.messages[0]!)
    expect(msg.channel).toBe('org:org-1')
    expect(msg.event).toBe('agent.created')
    expect(msg.data.agentId).toBe('a1')
  })

  it('broadcast reaches multiple org subscribers', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    orgSubscribe('org-1', ws1)
    orgSubscribe('org-1', ws2)
    orgBroadcast('org-1', 'agent.created', {})
    expect(ws1.messages).toHaveLength(1)
    expect(ws2.messages).toHaveLength(1)
  })

  it('broadcast does not reach closed connections', () => {
    const ws = makeMockWs(3)
    orgSubscribe('org-1', ws)
    orgBroadcast('org-1', 'agent.created', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('unsubscribe stops delivery', () => {
    const ws = makeMockWs()
    orgSubscribe('org-1', ws)
    orgUnsubscribe('org-1', ws)
    orgBroadcast('org-1', 'agent.created', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('unsubscribe of unknown org is a no-op', () => {
    const ws = makeMockWs()
    expect(() => orgUnsubscribe('nonexistent', ws)).not.toThrow()
  })

  it('broadcast to unknown org is a no-op', () => {
    expect(() => orgBroadcast('nonexistent', 'event', {})).not.toThrow()
  })

  it('cleanup removes ws from all org feeds', () => {
    const ws = makeMockWs()
    orgSubscribe('org-1', ws)
    orgSubscribe('org-2', ws)
    orgCleanup(ws)
    orgBroadcast('org-1', 'agent.created', {})
    orgBroadcast('org-2', 'agent.created', {})
    expect(ws.messages).toHaveLength(0)
  })

  it('cleanup does not affect other subscribers in the same org', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    orgSubscribe('org-1', ws1)
    orgSubscribe('org-1', ws2)
    orgCleanup(ws1)
    orgBroadcast('org-1', 'agent.created', {})
    expect(ws1.messages).toHaveLength(0)
    expect(ws2.messages).toHaveLength(1)
  })
})

// ─── Presence ─────────────────────────────────────────────────────────────────

describe('Presence', () => {
  beforeEach(() => {
    clearPresence()
  })

  it('setOnline marks an agent as online', () => {
    const ws = makeMockWs()
    setOnline('agent-1', ws)
    expect(isOnline('agent-1')).toBe(true)
  })

  it('isOnline returns false for unknown agent', () => {
    expect(isOnline('nobody')).toBe(false)
  })

  it('setOffline marks an agent as offline', () => {
    const ws = makeMockWs()
    setOnline('agent-1', ws)
    setOffline('agent-1')
    expect(isOnline('agent-1')).toBe(false)
  })

  it('setOffline of unknown agent is a no-op', () => {
    expect(() => setOffline('nobody')).not.toThrow()
  })

  it('getOnlineAgents returns all online agent IDs', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    setOnline('agent-1', ws1)
    setOnline('agent-2', ws2)
    const online = getOnlineAgents()
    expect(online).toContain('agent-1')
    expect(online).toContain('agent-2')
    expect(online).toHaveLength(2)
  })

  it('getOnlineAgents excludes agents that went offline', () => {
    const ws = makeMockWs()
    setOnline('agent-1', ws)
    setOffline('agent-1')
    expect(getOnlineAgents()).toHaveLength(0)
  })

  it('cleanupPresence removes agent whose ws matches', () => {
    const ws = makeMockWs()
    setOnline('agent-1', ws)
    cleanupPresence(ws)
    expect(isOnline('agent-1')).toBe(false)
  })

  it('cleanupPresence does not affect agents with a different ws', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    setOnline('agent-1', ws1)
    setOnline('agent-2', ws2)
    cleanupPresence(ws1)
    expect(isOnline('agent-1')).toBe(false)
    expect(isOnline('agent-2')).toBe(true)
  })
})

// ─── broadcast() top-level function ──────────────────────────────────────────

describe('broadcast() top-level', () => {
  beforeEach(() => {
    clearSessionChannels()
    clearOrgFeeds()
  })

  it('routes session: channels to SessionChannel', () => {
    const ws = makeMockWs()
    sessionSubscribe('sess-99', ws)
    broadcast('session:sess-99', 'turn.added', { x: 1 })
    expect(ws.messages).toHaveLength(1)
    const msg = JSON.parse(ws.messages[0]!)
    expect(msg.event).toBe('turn.added')
  })

  it('routes org: channels to OrgFeed', () => {
    const ws = makeMockWs()
    orgSubscribe('org-99', ws)
    broadcast('org:org-99', 'session.created', { sessionId: 's1' })
    expect(ws.messages).toHaveLength(1)
    const msg = JSON.parse(ws.messages[0]!)
    expect(msg.event).toBe('session.created')
  })

  it('unknown channel format is a no-op', () => {
    expect(() => broadcast('unknown:foo', 'event', {})).not.toThrow()
  })
})
