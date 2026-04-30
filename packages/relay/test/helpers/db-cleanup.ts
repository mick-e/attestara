import { getPrisma } from '../../src/utils/prisma.js'
import { clearNonceStore } from '../../src/utils/siwe.js'

/**
 * Delete all rows from all tables in FK-safe order.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function clearAllStores(): Promise<void> {
  const db = getPrisma()
  // Delete in reverse FK dependency order
  await db.auditLog.deleteMany()
  await db.webhookDelivery.deleteMany()
  await db.webhook.deleteMany()
  await db.commitment.deleteMany()
  await db.turn.deleteMany()
  await db.session.deleteMany()
  await db.credential.deleteMany()
  await db.agent.deleteMany()
  await db.apiKey.deleteMany()
  await db.refreshToken.deleteMany()
  await db.user.deleteMany()
  await db.invite.deleteMany()
  await db.organisation.deleteMany()
  // Clear Redis nonce store
  await clearNonceStore()
}
