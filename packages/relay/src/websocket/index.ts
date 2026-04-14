/**
 * WebSocket plugin for the Attestara relay.
 *
 * Clients connect to /ws?token=<JWT> and then send subscribe messages:
 *   { type: 'subscribe', channel: 'session:<sessionId>' }
 *   { type: 'subscribe', channel: 'org:<orgId>' }
 *
 * The exported broadcast() function lets other parts of the relay push
 * events to all subscribers on a given channel.
 */

import type { FastifyPluginAsync } from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import { verifyToken } from '../middleware/auth.js'
import * as sessionChannel from './session-channel.js'
import * as orgFeed from './org-feed.js'
import { setOnline, setOffline, cleanupPresence } from './presence.js'


export interface SubscribeMessage {
  type: 'subscribe'
  channel: string
  agentId?: string
}

/**
 * Broadcast an event to all WebSocket subscribers on a channel.
 *
 * channel formats:
 *   'session:<sessionId>'  → SessionChannel
 *   'org:<orgId>'          → OrgFeed
 */
export function broadcast(channel: string, event: string, data: unknown): void {
  if (channel.startsWith('session:')) {
    const sessionId = channel.slice('session:'.length)
    sessionChannel.broadcast(sessionId, event, data)
  } else if (channel.startsWith('org:')) {
    const orgId = channel.slice('org:'.length)
    orgFeed.broadcast(orgId, event, data)
  }
}

export const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  const JWT_SECRET = fastify.config.JWT_SECRET

  await fastify.register(fastifyWebsocket)

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    // Authenticate via ?token= query param
    const query = request.query as Record<string, string>
    const token = query['token']

    if (!token) {
      socket.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'token required' }))
      socket.close()
      return
    }

    let payload: ReturnType<typeof verifyToken>
    try {
      payload = verifyToken(token, JWT_SECRET)
    } catch {
      socket.send(JSON.stringify({ type: 'error', code: 'INVALID_TOKEN', message: 'Invalid or expired token' }))
      socket.close()
      return
    }

    if (payload.type !== 'access') {
      socket.send(JSON.stringify({ type: 'error', code: 'INVALID_TOKEN', message: 'Expected access token' }))
      socket.close()
      return
    }

    // Send connection confirmation
    socket.send(JSON.stringify({
      type: 'connected',
      userId: payload.sub,
      orgId: payload.orgId,
    }))

    // ── Heartbeat ────────────────────────────────────────────────────────────
    const HEARTBEAT_INTERVAL = 30_000
    let pongReceived = true

    const heartbeat = setInterval(() => {
      if (!pongReceived) {
        // No pong received since last ping — close the connection
        socket.close(1001, 'Heartbeat timeout')
        clearInterval(heartbeat)
        return
      }
      pongReceived = false
      if (socket.readyState === socket.OPEN) {
        if (typeof socket.ping === 'function') {
          socket.ping()
        }
      }
    }, HEARTBEAT_INTERVAL)

    socket.on('pong', () => {
      pongReceived = true
    })

    // Handle incoming messages
    socket.on('message', (rawMessage: Buffer | string) => {
      let msg: unknown
      try {
        msg = JSON.parse(rawMessage.toString())
      } catch {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' }))
        return
      }

      if (!isSubscribeMessage(msg)) {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_MESSAGE', message: 'Unknown message type' }))
        return
      }

      const { channel, agentId } = msg

      if (channel.startsWith('session:')) {
        const sessionId = channel.slice('session:'.length)
        sessionChannel.subscribe(sessionId, socket)
        socket.send(JSON.stringify({ type: 'subscribed', channel }))
      } else if (channel.startsWith('org:')) {
        const orgId = channel.slice('org:'.length)
        // Enforce that users can only subscribe to their own org feed
        if (orgId !== payload.orgId) {
          socket.send(JSON.stringify({ type: 'error', code: 'FORBIDDEN', message: 'Cannot subscribe to another org feed' }))
          return
        }
        orgFeed.subscribe(orgId, socket)
        socket.send(JSON.stringify({ type: 'subscribed', channel }))
      } else {
        socket.send(JSON.stringify({ type: 'error', code: 'INVALID_CHANNEL', message: 'Unknown channel format' }))
        return
      }

      // Track agent presence if agentId provided
      if (agentId) {
        setOnline(agentId, socket)
      }
    })

    // Cleanup on disconnect
    socket.on('close', () => {
      clearInterval(heartbeat)
      sessionChannel.cleanup(socket)
      orgFeed.cleanup(socket)
      cleanupPresence(socket)

      // Track the agent as offline
      if (payload) {
        setOffline(payload.sub)
      }
    })
  })
}

function isSubscribeMessage(msg: unknown): msg is SubscribeMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as SubscribeMessage).type === 'subscribe' &&
    typeof (msg as SubscribeMessage).channel === 'string'
  )
}
