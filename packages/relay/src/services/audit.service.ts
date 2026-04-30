import { getPrisma } from '../utils/prisma.js'
import type { Prisma } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'

export interface AuditContext {
  orgId?: string
  userId?: string
  actorIp?: string
  action: string
  resource?: string
  outcome: 'success' | 'failure' | 'denied'
  metadata?: Record<string, unknown>
}

const fallbackLogger: { warn: (...args: unknown[]) => void } = console

let _logger: FastifyBaseLogger | typeof fallbackLogger = fallbackLogger

export function setAuditLogger(log: FastifyBaseLogger): void {
  _logger = log
}

/**
 * Record an audit event. MUST NOT throw — logs on failure but never propagates.
 */
export async function recordAudit(ctx: AuditContext): Promise<void> {
  try {
    await getPrisma().auditLog.create({
      data: {
        orgId: ctx.orgId ?? null,
        userId: ctx.userId ?? null,
        actorIp: ctx.actorIp ?? null,
        action: ctx.action,
        resource: ctx.resource ?? null,
        outcome: ctx.outcome,
        metadata: (ctx.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    })
  } catch (err) {
    // Audit failures must NEVER propagate — log and swallow
    _logger.warn({ err, auditAction: ctx.action }, 'Failed to write audit log')
  }
}
