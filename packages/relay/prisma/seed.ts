import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

async function main() {
  console.log('Seeding database...')

  // Create test organisation
  const org = await prisma.organisation.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Organisation',
      slug: 'test-org',
      plan: 'starter',
    },
  })
  console.log(`  Organisation: ${org.name} (${org.id})`)

  // Create second org for cross-org session testing
  const org2 = await prisma.organisation.upsert({
    where: { slug: 'partner-org' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Partner Organisation',
      slug: 'partner-org',
      plan: 'starter',
    },
  })
  console.log(`  Organisation: ${org2.name} (${org2.id})`)

  // Create test user (password: "testpassword123")
  const passwordHash = sha256('testpassword123')
  const user = await prisma.user.upsert({
    where: { email: 'admin@test-org.dev' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      orgId: org.id,
      email: 'admin@test-org.dev',
      passwordHash,
      role: 'admin',
      emailVerified: true,
    },
  })
  console.log(`  User: ${user.email} (${user.id})`)

  // Create second user (member role)
  const user2 = await prisma.user.upsert({
    where: { email: 'member@test-org.dev' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      orgId: org.id,
      email: 'member@test-org.dev',
      passwordHash,
      role: 'member',
      emailVerified: true,
    },
  })
  console.log(`  User: ${user2.email} (${user2.id})`)

  // Create test agent
  const agentDid = 'did:attestara:test:agent-001'
  const agent = await prisma.agent.upsert({
    where: { did: agentDid },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      orgId: org.id,
      did: agentDid,
      name: 'Test Agent Alpha',
      status: 'active',
      metadata: { description: 'Primary test agent', version: '1.0.0' },
      publicKey: 'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    },
  })
  console.log(`  Agent: ${agent.name} (${agent.did})`)

  // Create second agent in partner org
  const agent2Did = 'did:attestara:test:agent-002'
  const agent2 = await prisma.agent.upsert({
    where: { did: agent2Did },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      orgId: org2.id,
      did: agent2Did,
      name: 'Test Agent Beta',
      status: 'active',
      metadata: { description: 'Partner test agent', version: '1.0.0' },
      publicKey: 'ed25519:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    },
  })
  console.log(`  Agent: ${agent2.name} (${agent2.did})`)

  // Create test credential
  const credentialHash = sha256('test-credential-data-001')
  const credential = await prisma.credential.upsert({
    where: { credentialHash },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000001000',
      orgId: org.id,
      agentId: agent.id,
      credentialHash,
      schemaHash: sha256('attestara-identity-v1'),
      ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      credentialDataCached: {
        type: 'IdentityCredential',
        issuer: agentDid,
        issuanceDate: new Date().toISOString(),
        claims: { name: 'Test Entity', jurisdiction: 'GB' },
      },
      expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      revoked: false,
    },
  })
  console.log(`  Credential: ${credential.credentialHash.slice(0, 16)}... (${credential.id})`)

  // Create test API key (key: "att_test_seed_key_do_not_use_in_prod")
  const apiKeyRaw = 'att_test_seed_key_do_not_use_in_prod'
  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash: sha256(apiKeyRaw) },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000010000',
      orgId: org.id,
      keyHash: sha256(apiKeyRaw),
      name: 'Development Seed Key',
      scopes: ['agents:read', 'agents:write', 'credentials:read', 'credentials:write', 'sessions:read', 'sessions:write'],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  })
  console.log(`  API Key: ${apiKey.name} (raw key: ${apiKeyRaw})`)

  // Create test webhook
  const webhook = await prisma.webhook.create({
    data: {
      id: '00000000-0000-0000-0000-000000100000',
      orgId: org.id,
      url: 'https://webhook.site/test-attestara',
      secretHash: sha256('whsec_test_secret'),
      events: ['session.created', 'session.completed', 'commitment.anchored'],
      active: true,
    },
  })
  console.log(`  Webhook: ${webhook.url} (${webhook.id})`)

  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
