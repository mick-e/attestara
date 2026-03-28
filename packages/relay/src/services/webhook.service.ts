import { randomBytes, createHash, createHmac } from 'crypto'
import { getPrisma } from '../utils/prisma.js'

const ORG_MASTER_KEY_SECRET = process.env.ORG_MASTER_KEY_SECRET ?? 'test-master-key-at-least-32-chars!!'

/** Reversible encoding: XOR-based with key derived from master secret + a nonce prefix */
function encryptSecret(raw: string): string {
  // Derive a 32-byte key from master secret
  const key = createHash('sha256').update(ORG_MASTER_KEY_SECRET).digest()
  const rawBuf = Buffer.from(raw, 'utf8')
  const encrypted = Buffer.alloc(rawBuf.length)
  for (let i = 0; i < rawBuf.length; i++) {
    encrypted[i] = rawBuf[i] ^ key[i % key.length]
  }
  return encrypted.toString('base64')
}

function decryptSecret(encoded: string): string {
  const key = createHash('sha256').update(ORG_MASTER_KEY_SECRET).digest()
  const encryptedBuf = Buffer.from(encoded, 'base64')
  const decrypted = Buffer.alloc(encryptedBuf.length)
  for (let i = 0; i < encryptedBuf.length; i++) {
    decrypted[i] = encryptedBuf[i] ^ key[i % key.length]
  }
  return decrypted.toString('utf8')
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
    return rows.map((row: any) => this._toView(this._fromRow(row)))
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
        payload: payload as any,
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
    return rows.map((row: any) => this._deliveryFromRow(row))
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

  private _fromRow(row: any): StoredWebhook {
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

  private _deliveryFromRow(row: any): StoredDelivery {
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
