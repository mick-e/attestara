import { randomUUID } from 'crypto'
import { getPrisma } from '../utils/prisma.js'

export interface StoredUser {
  id: string
  orgId: string
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
  emailVerified: boolean
}

export interface StoredOrg {
  id: string
  name: string
  slug: string
  plan: string
}

export interface CreateUserData {
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
}

function toStoredOrg(row: { id: string; name: string; slug: string; plan: string }): StoredOrg {
  return { id: row.id, name: row.name, slug: row.slug, plan: row.plan }
}

function toStoredUser(row: {
  id: string
  orgId: string
  email: string
  passwordHash: string
  walletAddress: string | null
  role: string
  emailVerified: boolean
}): StoredUser {
  return {
    id: row.id,
    orgId: row.orgId,
    email: row.email,
    passwordHash: row.passwordHash,
    walletAddress: row.walletAddress,
    role: row.role,
    emailVerified: row.emailVerified,
  }
}

export class OrgService {
  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async createOrg(name: string, plan = 'starter'): Promise<StoredOrg> {
    const row = await getPrisma().organisation.create({
      data: {
        name,
        slug: this.slugify(name) + '-' + randomUUID().slice(0, 6),
        plan,
      },
    })
    return toStoredOrg(row)
  }

  async getOrg(id: string): Promise<StoredOrg | null> {
    const row = await getPrisma().organisation.findUnique({ where: { id } })
    return row ? toStoredOrg(row) : null
  }

  async updateOrg(id: string, updates: Partial<Pick<StoredOrg, 'name' | 'plan'>>): Promise<StoredOrg | null> {
    const existing = await getPrisma().organisation.findUnique({ where: { id } })
    if (!existing) return null

    const row = await getPrisma().organisation.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.plan !== undefined && { plan: updates.plan }),
      },
    })
    return toStoredOrg(row)
  }

  async createUser(orgId: string, data: CreateUserData): Promise<StoredUser> {
    const row = await getPrisma().user.create({
      data: {
        orgId,
        email: data.email,
        passwordHash: data.passwordHash,
        walletAddress: data.walletAddress,
        role: data.role,
        emailVerified: false,
      },
    })
    return toStoredUser(row)
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const row = await getPrisma().user.findUnique({ where: { email } })
    return row ? toStoredUser(row) : null
  }

  async getUserByWallet(address: string): Promise<StoredUser | null> {
    const row = await getPrisma().user.findUnique({ where: { walletAddress: address } })
    return row ? toStoredUser(row) : null
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    const row = await getPrisma().user.findUnique({ where: { id } })
    return row ? toStoredUser(row) : null
  }

  async hasEmail(email: string): Promise<boolean> {
    const count = await getPrisma().user.count({ where: { email } })
    return count > 0
  }

  async listMembers(orgId: string): Promise<string[]> {
    const users = await getPrisma().user.findMany({
      where: { orgId },
      select: { id: true },
    })
    return users.map(u => u.id)
  }

  async addMember(orgId: string, userId: string): Promise<void> {
    await getPrisma().user.update({
      where: { id: userId },
      data: { orgId },
    })
  }

  async createInvite(orgId: string, email: string, role: string): Promise<string> {
    const invite = await getPrisma().invite.create({
      data: {
        orgId,
        email,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day expiry
      },
    })
    return invite.id
  }

  async getInvite(inviteId: string): Promise<{ orgId: string; email: string; role: string } | null> {
    const invite = await getPrisma().invite.findUnique({ where: { id: inviteId } })
    if (!invite) return null
    if (new Date() > invite.expiresAt) return null
    return { orgId: invite.orgId, email: invite.email, role: invite.role }
  }

  async clearStores(): Promise<void> {
    // Delete in FK-safe order (all child tables before organisations)
    await getPrisma().webhookDelivery.deleteMany()
    await getPrisma().webhook.deleteMany()
    await getPrisma().commitment.deleteMany()
    await getPrisma().turn.deleteMany()
    await getPrisma().session.deleteMany()
    await getPrisma().credential.deleteMany()
    await getPrisma().agent.deleteMany()
    await getPrisma().apiKey.deleteMany()
    await getPrisma().invite.deleteMany()
    await getPrisma().refreshToken.deleteMany()
    await getPrisma().user.deleteMany()
    await getPrisma().organisation.deleteMany()
  }
}

/** Singleton instance shared across routes */
export const orgService = new OrgService()
