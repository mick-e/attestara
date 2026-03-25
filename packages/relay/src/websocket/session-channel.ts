/**
 * Session channel manager.
 * Tracks WebSocket subscribers per session ID and broadcasts events to them.
 */

export interface MinimalWebSocket {
  send(data: string): void
  readyState: number
}

// readyState values (matches WebSocket standard)
const WS_OPEN = 1

const sessionMap = new Map<string, Set<MinimalWebSocket>>()

/**
 * Subscribe a WebSocket connection to a session channel.
 */
export function subscribe(sessionId: string, ws: MinimalWebSocket): void {
  let subs = sessionMap.get(sessionId)
  if (!subs) {
    subs = new Set()
    sessionMap.set(sessionId, subs)
  }
  subs.add(ws)
}

/**
 * Unsubscribe a WebSocket connection from a session channel.
 */
export function unsubscribe(sessionId: string, ws: MinimalWebSocket): void {
  const subs = sessionMap.get(sessionId)
  if (!subs) return
  subs.delete(ws)
  if (subs.size === 0) {
    sessionMap.delete(sessionId)
  }
}

/**
 * Broadcast an event to all subscribers of a session channel.
 */
export function broadcast(sessionId: string, event: string, data: unknown): void {
  const subs = sessionMap.get(sessionId)
  if (!subs) return
  const message = JSON.stringify({ channel: `session:${sessionId}`, event, data })
  for (const ws of subs) {
    if (ws.readyState === WS_OPEN) {
      ws.send(message)
    }
  }
}

/**
 * Remove a WebSocket connection from all session subscriptions (called on disconnect).
 */
export function cleanup(ws: MinimalWebSocket): void {
  for (const [sessionId, subs] of sessionMap) {
    subs.delete(ws)
    if (subs.size === 0) {
      sessionMap.delete(sessionId)
    }
  }
}

/**
 * Clear all state (for testing).
 */
export function clearSessionChannels(): void {
  sessionMap.clear()
}
