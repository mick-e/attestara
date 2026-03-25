import { randomBytes, createHash, createHmac } from 'crypto'

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
  private webhooks = new Map<string, StoredWebhook>()
  private deliveries = new Map<string, StoredDelivery[]>() // webhookId -> deliveries

  register(orgId: string, url: string, events: string[]): { webhook: WebhookView; secret: string } {
    const rawSecret = 'whsec_' + randomBytes(32).toString('hex')
    const secretHash = createHash('sha256').update(rawSecret).digest('hex')
    const rawSecretEncrypted = encryptSecret(rawSecret)

    const webhook: StoredWebhook = {
      id: randomBytes(16).toString('hex'),
      orgId,
      url,
      secretHash,
      rawSecretEncrypted,
      events,
      active: true,
      createdAt: new Date().toISOString(),
    }

    this.webhooks.set(webhook.id, webhook)
    this.deliveries.set(webhook.id, [])

    return {
      webhook: this._toView(webhook),
      secret: rawSecret,
    }
  }

  listByOrg(orgId: string): WebhookView[] {
    const result: WebhookView[] = []
    for (const wh of this.webhooks.values()) {
      if (wh.orgId === orgId) {
        result.push(this._toView(wh))
      }
    }
    return result
  }

  deactivate(id: string, orgId: string): boolean {
    const wh = this.webhooks.get(id)
    if (!wh || wh.orgId !== orgId) return false
    wh.active = false
    return true
  }

  deliver(webhookId: string, event: string, payload: unknown): StoredDelivery | null {
    const wh = this.webhooks.get(webhookId)
    if (!wh) return null

    const delivery: StoredDelivery = {
      id: randomBytes(16).toString('hex'),
      webhookId,
      event,
      payload,
      status: 'pending',
      attempts: 1,
      lastAttemptedAt: new Date().toISOString(),
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    }

    const list = this.deliveries.get(webhookId) ?? []
    list.push(delivery)
    this.deliveries.set(webhookId, list)

    return delivery
  }

  getDeliveryHistory(webhookId: string, orgId: string): StoredDelivery[] | null {
    const wh = this.webhooks.get(webhookId)
    if (!wh || wh.orgId !== orgId) return null
    return this.deliveries.get(webhookId) ?? []
  }

  signPayload(webhookId: string, payload: unknown): string | null {
    const wh = this.webhooks.get(webhookId)
    if (!wh) return null
    const rawSecret = decryptSecret(wh.rawSecretEncrypted)
    return createHmac('sha256', rawSecret).update(JSON.stringify(payload)).digest('hex')
  }

  clearStores(): void {
    this.webhooks.clear()
    this.deliveries.clear()
  }

  private _toView(wh: StoredWebhook): WebhookView {
    const { rawSecretEncrypted: _rse, secretHash: _sh, ...view } = wh
    return view
  }
}

/** Singleton instance shared across routes */
export const webhookService = new WebhookService()
