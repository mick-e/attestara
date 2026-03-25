/**
 * Agent presence tracker.
 * Tracks which agents are currently online via their WebSocket connection.
 */

import type { MinimalWebSocket } from './session-channel.js'

interface PresenceEntry {
  ws: MinimalWebSocket
  lastSeen: Date
}

const presenceMap = new Map<string, PresenceEntry>()

/**
 * Mark an agent as online, associating it with its WebSocket connection.
 */
export function setOnline(agentId: string, ws: MinimalWebSocket): void {
  presenceMap.set(agentId, { ws, lastSeen: new Date() })
}

/**
 * Mark an agent as offline, removing its presence entry.
 */
export function setOffline(agentId: string): void {
  presenceMap.delete(agentId)
}

/**
 * Check whether a given agent is currently online.
 */
export function isOnline(agentId: string): boolean {
  return presenceMap.has(agentId)
}

/**
 * Return the list of all currently-online agent IDs.
 */
export function getOnlineAgents(): string[] {
  return Array.from(presenceMap.keys())
}

/**
 * Remove any agent whose connection matches the given WebSocket (called on disconnect).
 */
export function cleanupPresence(ws: MinimalWebSocket): void {
  for (const [agentId, entry] of presenceMap) {
    if (entry.ws === ws) {
      presenceMap.delete(agentId)
    }
  }
}

/**
 * Clear all state (for testing).
 */
export function clearPresence(): void {
  presenceMap.clear()
}
