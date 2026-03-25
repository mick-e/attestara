import { randomUUID } from 'crypto'

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

export class OrgService {
  private orgs = new Map<string, StoredOrg>()
  private users = new Map<string, StoredUser>()
  private emailIndex = new Map<string, string>() // email -> userId
  private walletIndex = new Map<string, string>() // walletAddress -> userId
  private orgMembers = new Map<string, Set<string>>() // orgId -> Set<userId>
  private invites = new Map<string, { orgId: string; email: string; role: string }>()

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  createOrg(name: string, plan = 'starter'): StoredOrg {
    const org: StoredOrg = {
      id: randomUUID(),
      name,
      slug: this.slugify(name) + '-' + randomUUID().slice(0, 6),
      plan,
    }
    this.orgs.set(org.id, org)
    return org
  }

  getOrg(id: string): StoredOrg | null {
    return this.orgs.get(id) ?? null
  }

  updateOrg(id: string, updates: Partial<Pick<StoredOrg, 'name' | 'plan'>>): StoredOrg | null {
    const org = this.orgs.get(id)
    if (!org) return null
    if (updates.name !== undefined) org.name = updates.name
    if (updates.plan !== undefined) org.plan = updates.plan
    return org
  }

  createUser(orgId: string, data: CreateUserData): StoredUser {
    const user: StoredUser = {
      id: randomUUID(),
      orgId,
      email: data.email,
      passwordHash: data.passwordHash,
      walletAddress: data.walletAddress,
      role: data.role,
      emailVerified: false,
    }
    this.users.set(user.id, user)
    this.emailIndex.set(data.email, user.id)
    if (data.walletAddress) {
      this.walletIndex.set(data.walletAddress, user.id)
    }

    // Add to orgMembers
    let members = this.orgMembers.get(orgId)
    if (!members) {
      members = new Set<string>()
      this.orgMembers.set(orgId, members)
    }
    members.add(user.id)

    return user
  }

  getUserByEmail(email: string): StoredUser | null {
    const userId = this.emailIndex.get(email)
    if (!userId) return null
    return this.users.get(userId) ?? null
  }

  getUserByWallet(address: string): StoredUser | null {
    const userId = this.walletIndex.get(address)
    if (!userId) return null
    return this.users.get(userId) ?? null
  }

  getUserById(id: string): StoredUser | null {
    return this.users.get(id) ?? null
  }

  hasEmail(email: string): boolean {
    return this.emailIndex.has(email)
  }

  listMembers(orgId: string): string[] {
    const members = this.orgMembers.get(orgId)
    if (!members) return []
    return Array.from(members)
  }

  addMember(orgId: string, userId: string): void {
    let members = this.orgMembers.get(orgId)
    if (!members) {
      members = new Set<string>()
      this.orgMembers.set(orgId, members)
    }
    members.add(userId)
  }

  createInvite(orgId: string, email: string, role: string): string {
    const inviteId = randomUUID()
    this.invites.set(inviteId, { orgId, email, role })
    return inviteId
  }

  getInvite(inviteId: string): { orgId: string; email: string; role: string } | null {
    return this.invites.get(inviteId) ?? null
  }

  clearStores(): void {
    this.orgs.clear()
    this.users.clear()
    this.emailIndex.clear()
    this.walletIndex.clear()
    this.orgMembers.clear()
    this.invites.clear()
  }
}

/** Singleton instance shared across routes */
export const orgService = new OrgService()
