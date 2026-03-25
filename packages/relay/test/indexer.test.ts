import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock ethers BEFORE importing any module under test.
// vi.mock is hoisted to the top — factory must not reference outer variables.
// We use module-level state accessed via closures inside the factory.
// ---------------------------------------------------------------------------

vi.mock('ethers', () => {
  // Internal state (no outer variable references — safe for hoisting).
  const _handlers: Record<string, Record<string, ((...args: unknown[]) => void)[]>> = {}
  const _removed: string[] = []
  let _providerDestroyed = false
  const _queryFilterOverrides: Map<string, unknown[]> = new Map()

  function makeContract(address: string) {
    if (!_handlers[address]) _handlers[address] = {}
    return {
      address,
      on: vi.fn((eventName: string, handler: (...args: unknown[]) => void) => {
        if (!_handlers[address]) _handlers[address] = {}
        if (!_handlers[address][eventName]) _handlers[address][eventName] = []
        _handlers[address][eventName].push(handler)
      }),
      removeAllListeners: vi.fn(() => {
        _removed.push(address)
        delete _handlers[address]
      }),
      filters: {
        AgentRegistered: vi.fn(() => ({})),
        CommitmentCreated: vi.fn(() => ({})),
      },
      queryFilter: vi.fn().mockImplementation(async () => {
        return _queryFilterOverrides.get(address) ?? []
      }),
    }
  }

  const MockContract = vi.fn().mockImplementation(makeContract)
  const MockProvider = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(() => { _providerDestroyed = true }),
  }))

  // Expose internal state so tests can read / mutate it.
  ;(MockContract as unknown as Record<string, unknown>).__state = {
    _handlers,
    _removed,
    get _providerDestroyed() { return _providerDestroyed },
    set _providerDestroyed(v: boolean) { _providerDestroyed = v },
    _queryFilterOverrides,
  }
  ;(MockProvider as unknown as Record<string, unknown>).__state = (MockContract as unknown as Record<string, unknown>).__state

  return {
    ethers: {
      JsonRpcProvider: MockProvider,
      Contract: MockContract,
    },
  }
})

// Now import modules under test (mocks are already registered).
import { ethers } from 'ethers'
import { ChainEventListener } from '../src/indexer/listener.js'
import { backfill } from '../src/indexer/backfill.js'
import { startIndexer, stopIndexer } from '../src/indexer/index.js'

// ---------------------------------------------------------------------------
// Helpers to access shared mock state
// ---------------------------------------------------------------------------

type MockState = {
  _handlers: Record<string, Record<string, ((...args: unknown[]) => void)[]>>
  _removed: string[]
  _providerDestroyed: boolean
  _queryFilterOverrides: Map<string, unknown[]>
}

function getState(): MockState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ethers.Contract as unknown as any).__state as MockState
}

function resetState() {
  const s = getState()
  for (const k of Object.keys(s._handlers)) delete s._handlers[k]
  s._removed.length = 0
  s._providerDestroyed = false
  s._queryFilterOverrides.clear()
}

async function fireEvent(address: string, eventName: string, ...args: unknown[]) {
  const s = getState()
  const handlers = s._handlers[address]?.[eventName] ?? []
  for (const h of handlers) await h(...args)
}

function makeEventLog(blockNumber: number, txHash: string) {
  return { blockNumber, transactionHash: txHash }
}

const AGENT_ADDR = '0xAgentRegistry'
const COMMITMENT_ADDR = '0xCommitmentContract'
const RPC_URL = 'http://localhost:8545'

// ---------------------------------------------------------------------------
// Tests — ChainEventListener
// ---------------------------------------------------------------------------

describe('ChainEventListener', () => {
  let listener: ChainEventListener

  beforeEach(() => {
    listener = new ChainEventListener()
    resetState()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await listener.stop()
  })

  it('processes a mock AgentRegistered event via callback', async () => {
    const received: unknown[] = []
    const callbacks = {
      onAgentRegistered: vi.fn(async (event: unknown) => { received.push(event) }),
    }

    await listener.start(RPC_URL, { agentRegistry: AGENT_ADDR }, callbacks)

    await fireEvent(
      AGENT_ADDR,
      'AgentRegistered',
      '0xagentId01',
      'did:ethr:0x123',
      '0xorgAdmin',
      makeEventLog(100, '0xtx01'),
    )

    expect(callbacks.onAgentRegistered).toHaveBeenCalledOnce()
    expect(received[0]).toMatchObject({
      agentId: '0xagentId01',
      did: 'did:ethr:0x123',
      orgAdmin: '0xorgAdmin',
      blockNumber: 100,
      txHash: '0xtx01',
    })
  })

  it('processes a mock CommitmentCreated event via callback', async () => {
    const received: unknown[] = []
    const callbacks = {
      onCommitmentCreated: vi.fn(async (event: unknown) => { received.push(event) }),
    }

    await listener.start(RPC_URL, { commitmentContract: COMMITMENT_ADDR }, callbacks)

    await fireEvent(
      COMMITMENT_ADDR,
      'CommitmentCreated',
      '0xcommitmentId01',
      '0xsessionId01',
      '0xagreementHash',
      makeEventLog(200, '0xtx02'),
    )

    expect(callbacks.onCommitmentCreated).toHaveBeenCalledOnce()
    expect(received[0]).toMatchObject({
      commitmentId: '0xcommitmentId01',
      sessionId: '0xsessionId01',
      agreementHash: '0xagreementHash',
      blockNumber: 200,
      txHash: '0xtx02',
    })
  })

  it('stop() removes listeners from all contracts and destroys provider', async () => {
    await listener.start(
      RPC_URL,
      { agentRegistry: AGENT_ADDR, commitmentContract: COMMITMENT_ADDR },
      {},
    )

    await listener.stop()

    const s = getState()
    expect(s._removed).toContain(AGENT_ADDR)
    expect(s._removed).toContain(COMMITMENT_ADDR)
    expect(s._providerDestroyed).toBe(true)
  })

  it('does not invoke callback when no callbacks are provided', async () => {
    await listener.start(RPC_URL, { agentRegistry: AGENT_ADDR }, {})

    await expect(
      fireEvent(AGENT_ADDR, 'AgentRegistered', '0xid', 'did:ethr:0x1', '0xadmin', makeEventLog(1, '0xtx')),
    ).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Tests — backfill
// ---------------------------------------------------------------------------

describe('backfill', () => {
  beforeEach(() => {
    resetState()
    vi.clearAllMocks()
  })

  it('queries block range and processes AgentRegistered events', async () => {
    const fakeAgentEvent = {
      args: ['0xagentIdBackfill', 'did:ethr:0xBF', '0xorgAdminBF'],
      blockNumber: 50,
      transactionHash: '0xtxBF01',
    }
    getState()._queryFilterOverrides.set(AGENT_ADDR, [fakeAgentEvent])

    const provider = new ethers.JsonRpcProvider(RPC_URL) as unknown as import('ethers').ethers.JsonRpcProvider

    const received: unknown[] = []
    const result = await backfill(
      provider,
      { agentRegistry: AGENT_ADDR },
      {
        onAgentRegistered: async (event) => { received.push(event) },
      },
      10,
      100,
    )

    expect(result.agentRegisteredCount).toBe(1)
    expect(result.totalCount).toBe(1)
    expect(received[0]).toMatchObject({
      agentId: '0xagentIdBackfill',
      did: 'did:ethr:0xBF',
      orgAdmin: '0xorgAdminBF',
      blockNumber: 50,
      txHash: '0xtxBF01',
    })
  })

  it('queries block range and processes CommitmentCreated events', async () => {
    const fakeCommitmentEvent = {
      args: ['0xcommitIdBF', '0xsessionIdBF', '0xagreementBF'],
      blockNumber: 75,
      transactionHash: '0xtxBF02',
    }
    getState()._queryFilterOverrides.set(COMMITMENT_ADDR, [fakeCommitmentEvent])

    const provider = new ethers.JsonRpcProvider(RPC_URL) as unknown as import('ethers').ethers.JsonRpcProvider

    const received: unknown[] = []
    const result = await backfill(
      provider,
      { commitmentContract: COMMITMENT_ADDR },
      {
        onCommitmentCreated: async (event) => { received.push(event) },
      },
      1,
      200,
    )

    expect(result.commitmentCreatedCount).toBe(1)
    expect(result.totalCount).toBe(1)
    expect(received[0]).toMatchObject({
      commitmentId: '0xcommitIdBF',
      sessionId: '0xsessionIdBF',
      agreementHash: '0xagreementBF',
      blockNumber: 75,
      txHash: '0xtxBF02',
    })
  })

  it('returns zero counts when no events exist in range', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL) as unknown as import('ethers').ethers.JsonRpcProvider

    const result = await backfill(
      provider,
      { agentRegistry: AGENT_ADDR, commitmentContract: COMMITMENT_ADDR },
      {
        onAgentRegistered: vi.fn(),
        onCommitmentCreated: vi.fn(),
      },
      999,
      1000,
    )

    expect(result.totalCount).toBe(0)
    expect(result.agentRegisteredCount).toBe(0)
    expect(result.commitmentCreatedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Tests — startIndexer / stopIndexer
// ---------------------------------------------------------------------------

describe('startIndexer / stopIndexer', () => {
  beforeEach(() => {
    resetState()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await stopIndexer()
  })

  it('does not start when rpcUrl is empty string', async () => {
    const providerMock = ethers.JsonRpcProvider as unknown as ReturnType<typeof vi.fn>
    const callsBefore = providerMock.mock.calls.length

    await startIndexer({ rpcUrl: '' })

    // Provider should NOT be constructed when no RPC URL is given.
    expect(providerMock.mock.calls.length).toBe(callsBefore)
  })

  it('starts listener when rpcUrl is provided', async () => {
    const providerMock = ethers.JsonRpcProvider as unknown as ReturnType<typeof vi.fn>

    await startIndexer({
      rpcUrl: RPC_URL,
      contractAddresses: { agentRegistry: AGENT_ADDR },
    })

    expect(providerMock).toHaveBeenCalledWith(RPC_URL)
  })

  it('stopIndexer destroys provider and clears listener', async () => {
    await startIndexer({
      rpcUrl: RPC_URL,
      contractAddresses: { agentRegistry: AGENT_ADDR },
    })

    await stopIndexer()

    expect(getState()._providerDestroyed).toBe(true)
  })
})
