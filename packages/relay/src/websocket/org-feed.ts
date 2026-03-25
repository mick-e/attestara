/**
 * Org feed manager.
 * Tracks WebSocket subscribers per org ID and broadcasts events to them.
 */

import type { MinimalWebSocket } from './session-channel.js'

// readyState values (matches WebSocket standard)
const WS_OPEN = 1

const orgMap = new Map<string, Set<MinimalWebSocket>>()

/**
 * Subscribe a WebSocket connection to an org feed.
 */
export function subscribe(orgId: string, ws: MinimalWebSocket): void {
  let subs = orgMap.get(orgId)
  if (!subs) {
    subs = new Set()
    orgMap.set(orgId, subs)
  }
  subs.add(ws)
}

/**
 * Unsubscribe a WebSocket connection from an org feed.
 */
export function unsubscribe(orgId: string, ws: MinimalWebSocket): void {
  const subs = orgMap.get(orgId)
  if (!subs) return
  subs.delete(ws)
  if (subs.size === 0) {
    orgMap.delete(orgId)
  }
}

/**
 * Broadcast an event to all subscribers of an org feed.
 */
export function broadcast(orgId: string, event: string, data: unknown): void {
  const subs = orgMap.get(orgId)
  if (!subs) return
  const message = JSON.stringify({ channel: `org:${orgId}`, event, data })
  for (const ws of subs) {
    if (ws.readyState === WS_OPEN) {
      ws.send(message)
    }
  }
}

/**
 * Remove a WebSocket connection from all org subscriptions (called on disconnect).
 */
export function cleanup(ws: MinimalWebSocket): void {
  for (const [orgId, subs] of orgMap) {
    subs.delete(ws)
    if (subs.size === 0) {
      orgMap.delete(orgId)
    }
  }
}

/**
 * Clear all state (for testing).
 */
export function clearOrgFeeds(): void {
  orgMap.clear()
}
