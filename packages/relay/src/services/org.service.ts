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
    // Invites are ephemeral — keep in memory for now (no Prisma model)
    const inviteId = randomUUID()
    this._invites.set(inviteId, { orgId, email, role })
    return inviteId
  }

  getInvite(inviteId: string): { orgId: string; email: string; role: string } | null {
    return this._invites.get(inviteId) ?? null
  }

  async clearStores(): Promise<void> {
    // Delete in FK-safe order
    await getPrisma().user.deleteMany()
    await getPrisma().organisation.deleteMany()
    this._invites.clear()
  }

  // Invites stay in-memory (no Prisma model defined)
  private _invites = new Map<string, { orgId: string; email: string; role: string }>()
}

/** Singleton instance shared across routes */
export const orgService = new OrgService()
