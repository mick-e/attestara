import { describe, it, expect } from 'vitest'
import { LocalChain } from '../src/testing/local-chain.js'

describe('LocalChain', () => {
  it('initializes with default RPC URL', () => {
    const chain = new LocalChain()
    expect(chain.url).toBe('http://127.0.0.1:8545')
    expect(chain.isRunning).toBe(false)
  })

  it('accepts custom RPC URL', () => {
    const chain = new LocalChain('http://localhost:9545')
    expect(chain.url).toBe('http://localhost:9545')
  })

  it('transitions to running state on start', async () => {
    const chain = new LocalChain()
    expect(chain.isRunning).toBe(false)

    await chain.start()
    expect(chain.isRunning).toBe(true)
  })

  it('transitions to stopped state on stop', async () => {
    const chain = new LocalChain()
    await chain.start()
    expect(chain.isRunning).toBe(true)

    await chain.stop()
    expect(chain.isRunning).toBe(false)
  })

  it('returns snapshot ID when running', async () => {
    const chain = new LocalChain()
    await chain.start()

    const snapshotId = await chain.snapshot()
    expect(snapshotId).toBeTruthy()
    expect(typeof snapshotId).toBe('string')
  })

  it('throws when snapshotting while not running', async () => {
    const chain = new LocalChain()
    await expect(chain.snapshot()).rejects.toThrow('not running')
  })

  it('throws when reverting while not running', async () => {
    const chain = new LocalChain()
    await expect(chain.revert('snapshot-1')).rejects.toThrow('not running')
  })

  it('allows revert when running', async () => {
    const chain = new LocalChain()
    await chain.start()
    const id = await chain.snapshot()
    await expect(chain.revert(id)).resolves.not.toThrow()
  })
})
