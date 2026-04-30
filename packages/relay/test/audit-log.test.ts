import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Prisma before importing audit service
const mockCreate = vi.fn()
vi.mock('../src/utils/prisma.js', () => ({
  getPrisma: () => ({
    auditLog: { create: mockCreate },
  }),
}))

import { recordAudit } from '../src/services/audit.service.js'

describe('recordAudit', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('writes auth.login.failure with outcome failure', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'test-id' })

    await recordAudit({
      action: 'auth.login.failure',
      outcome: 'failure',
      actorIp: '127.0.0.1',
      userId: 'user-123',
      metadata: { reason: 'invalid_password' },
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'auth.login.failure',
        outcome: 'failure',
        actorIp: '127.0.0.1',
        userId: 'user-123',
      }),
    })
  })

  it('writes success audit events', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'test-id-2' })

    await recordAudit({
      action: 'auth.login.success',
      outcome: 'success',
      userId: 'user-456',
      orgId: 'org-789',
      actorIp: '10.0.0.1',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'auth.login.success',
        outcome: 'success',
        userId: 'user-456',
        orgId: 'org-789',
      }),
    })
  })

  it('never throws even when Prisma fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB down'))

    // Must not throw
    await expect(
      recordAudit({ action: 'test.action', outcome: 'failure' }),
    ).resolves.toBeUndefined()
  })

  it('sets null for optional fields when not provided', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'test-id-3' })

    await recordAudit({
      action: 'some.action',
      outcome: 'success',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        orgId: null,
        userId: null,
        actorIp: null,
        action: 'some.action',
        resource: null,
        outcome: 'success',
        metadata: undefined,
      },
    })
  })
})
