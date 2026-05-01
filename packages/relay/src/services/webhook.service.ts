import { randomBytes, createHash, createHmac, createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto'
import type { Prisma, Webhook, WebhookDelivery as PrismaWebhookDelivery } from '@prisma/client'
import { getPrisma } from '../utils/prisma.js'

let masterKeySecret: string = ''

export function initWebhookConfig(secret: string) {
  masterKeySecret = secret
}

/** Derive a 256-bit key from the master secret via SHA-256 */
function deriveKey(): Buffer {
  return createHash('sha256').update(masterKeySecret).digest()
}

/** Encrypt using AES-256-GCM. Output format: base64(iv):base64(authTag):base64(ciphertext) */
function encryptSecret(raw: string): string {
  const key = deriveKey()
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/** Decrypt AES-256-GCM ciphertext. Authenticates integrity via the embedded auth tag. */
function decryptSecret(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')
  const ivB64 = parts[0]
  const tagB64 = parts[1]
  const cipherB64 = parts[2]
  if (ivB64 === undefined || tagB64 === undefined || cipherB64 === undefined) {
    throw new Error('Invalid encrypted format')
  }
  const key = deriveKey()
  const authTag = Buffer.from(tagB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'), {
    authTagLength: 16,
  })
  decipher.setAuthTag(authTag)
  return Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Verify a webhook payload signature using a timing-safe HMAC-SHA256 comparison.
 * Both `signature` and the computed HMAC must be hex strings of identical length.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
}

export interface StoredWebhook {
  id: string
  orgId: string
  url: string
  secretHash: string
  rawSecretEncrypted: string
  events: string[]
  active: boolean
  createdAt: string
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed'

export interface StoredDelivery {
  id: string
  webhookId: string
  event: string
  payload: unknown
  status: DeliveryStatus
  attempts: number
  lastAttemptedAt: string | null
  deliveredAt: string | null
  createdAt: string
}

/** Public view of a webhook — no secrets */
export type WebhookView = Omit<StoredWebhook, 'rawSecretEncrypted' | 'secretHash'>

export class WebhookService {
  async register(orgId: string, url: string, events: string[]): Promise<{ webhook: WebhookView; secret: string }> {
    const rawSecret = 'whsec_' + randomBytes(32).toString('hex')
    const rawSecretEncrypted = encryptSecret(rawSecret)

    const db = getPrisma()
    // Store the encrypted raw secret in secretHash column so we can decrypt for signing
    const row = await db.webhook.create({
      data: {
        orgId,
        url,
        secretHash: rawSecretEncrypted,
        events,
        active: true,
      },
    })

    const stored = this._fromRow(row)
    return {
      webhook: this._toView(stored),
      secret: rawSecret,
    }
  }

  async listByOrg(orgId: string): Promise<WebhookView[]> {
    const db = getPrisma()
    const rows = await db.webhook.findMany({ where: { orgId } })
    return rows.map((row) => this._toView(this._fromRow(row)))
  }

  async deactivate(id: string, orgId: string): Promise<boolean> {
    const db = getPrisma()
    const existing = await db.webhook.findUnique({ where: { id } })
    if (!existing || existing.orgId !== orgId) return false

    await db.webhook.update({
      where: { id },
      data: { active: false },
    })
    return true
  }

  async deliver(webhookId: string, event: string, payload: unknown): Promise<StoredDelivery | null> {
    const db = getPrisma()
    const wh = await db.webhook.findUnique({ where: { id: webhookId } })
    if (!wh) return null

    const now = new Date()
    const row = await db.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: payload as Prisma.InputJsonValue,
        status: 'pending',
        attempts: 1,
        lastAttemptedAt: now,
        createdAt: now,
      },
    })

    return this._deliveryFromRow(row)
  }

  async getDeliveryHistory(webhookId: string, orgId: string): Promise<StoredDelivery[] | null> {
    const db = getPrisma()
    const wh = await db.webhook.findUnique({ where: { id: webhookId } })
    if (!wh || wh.orgId !== orgId) return null

    const rows = await db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => this._deliveryFromRow(row))
  }

  async testWebhook(webhookId: string, orgId: string): Promise<{ success: boolean; statusCode: number } | null> {
    const db = getPrisma()
    const wh = await db.webhook.findUnique({ where: { id: webhookId } })
    if (!wh || wh.orgId !== orgId) return null

    // Send a test event to the webhook URL
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test delivery from Attestara' },
    }

    try {
      const rawSecret = decryptSecret(wh.secretHash)
      const signature = createHmac('sha256', rawSecret).update(JSON.stringify(testPayload)).digest('hex')
      const response = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Attestara-Signature': signature,
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      })
      return { success: response.ok, statusCode: response.status }
    } catch (_err: unknown) {
      return { success: false, statusCode: 0 }
    }
  }

  async retryDelivery(deliveryId: string, orgId: string): Promise<StoredDelivery | null> {
    const db = getPrisma()
    const delivery = await db.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    })
    if (!delivery || delivery.webhook.orgId !== orgId) return null

    // Increment attempts and mark as pending for retry
    const updated = await db.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'pending',
        attempts: delivery.attempts + 1,
        lastAttemptedAt: new Date(),
      },
    })
    return this._deliveryFromRow(updated)
  }

  async signPayload(webhookId: string, payload: unknown): Promise<string | null> {
    const db = getPrisma()
    const wh = await db.webhook.findUnique({ where: { id: webhookId } })
    if (!wh) return null
    // secretHash column stores the encrypted raw secret; decrypt it for signing
    const rawSecret = decryptSecret(wh.secretHash)
    return createHmac('sha256', rawSecret).update(JSON.stringify(payload)).digest('hex')
  }

  async clearStores(): Promise<void> {
    const db = getPrisma()
    await db.webhookDelivery.deleteMany()
    await db.webhook.deleteMany()
  }

  private _toView(wh: StoredWebhook): WebhookView {
    const { rawSecretEncrypted: _rse, secretHash: _sh, ...view } = wh
    return view
  }

  private _fromRow(row: Webhook): StoredWebhook {
    // secretHash column holds the encrypted raw secret
    const rawSecretEncrypted = row.secretHash
    const secretHash = createHash('sha256').update(decryptSecret(rawSecretEncrypted)).digest('hex')
    return {
      id: row.id,
      orgId: row.orgId,
      url: row.url,
      secretHash,
      rawSecretEncrypted,
      events: row.events,
      active: row.active,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }
  }

  private _deliveryFromRow(row: PrismaWebhookDelivery): StoredDelivery {
    return {
      id: row.id,
      webhookId: row.webhookId,
      event: row.event,
      payload: row.payload,
      status: row.status as DeliveryStatus,
      attempts: row.attempts,
      lastAttemptedAt: row.lastAttemptedAt instanceof Date ? row.lastAttemptedAt.toISOString() : row.lastAttemptedAt,
      deliveredAt: row.deliveredAt instanceof Date ? row.deliveredAt.toISOString() : row.deliveredAt,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }
  }
}

/** Singleton instance shared across routes */
export const webhookService = new WebhookService()
