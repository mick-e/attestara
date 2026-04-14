import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryIPFSClient, PinataIPFSClient } from '../src/credentials/ipfs.js'

/**
 * Tests for IPFS clients. Network calls are mocked via global fetch.
 */

describe('MemoryIPFSClient', () => {
  it('should store and retrieve arbitrary data', async () => {
    const client = new MemoryIPFSClient()
    const payload = { hello: 'world', nested: { a: 1 } }
    const cid = await client.store(payload)
    expect(cid).toMatch(/^Qm/)

    const retrieved = await client.retrieve(cid)
    expect(retrieved).toEqual(payload)
  })

  it('should return a fresh deep-copy on each retrieve', async () => {
    const client = new MemoryIPFSClient()
    const original = { arr: [1, 2, 3] }
    const cid = await client.store(original)
    const first = (await client.retrieve(cid)) as { arr: number[] }
    first.arr.push(99)
    const second = (await client.retrieve(cid)) as { arr: number[] }
    expect(second.arr).toEqual([1, 2, 3])
  })

  it('should produce distinct CIDs for each call', async () => {
    const client = new MemoryIPFSClient()
    const c1 = await client.store({ a: 1 })
    const c2 = await client.store({ a: 1 })
    expect(c1).not.toBe(c2)
  })

  it('should throw when retrieving an unknown CID', async () => {
    const client = new MemoryIPFSClient()
    await expect(client.retrieve('Qmdoesnotexist')).rejects.toThrow(
      /CID not found/,
    )
  })
})

describe('PinataIPFSClient', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    // @ts-expect-error - overriding for test
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should POST to Pinata when api credentials are provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ IpfsHash: 'QmPinataHash' }),
    })
    // @ts-expect-error - mocked
    globalThis.fetch = mockFetch

    const client = new PinataIPFSClient('key', 'secret')
    const cid = await client.store({ payload: true })

    expect(cid).toBe('QmPinataHash')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.pinata.cloud/pinning/pinJSONToIPFS')
    expect(init.method).toBe('POST')
    expect(init.headers.pinata_api_key).toBe('key')
    expect(init.headers.pinata_secret_api_key).toBe('secret')
    expect(JSON.parse(init.body)).toEqual({ pinataContent: { payload: true } })
  })

  it('should fall back to a local IPFS node when credentials are missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ Hash: 'QmLocalHash' }),
    })
    // @ts-expect-error - mocked
    globalThis.fetch = mockFetch

    const client = new PinataIPFSClient(undefined, undefined, 'http://ipfs.local:5001')
    const cid = await client.store({ a: 1 })

    expect(cid).toBe('QmLocalHash')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://ipfs.local:5001/api/v0/add')
  })

  it('should retrieve via the configured gateway', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ retrieved: true }),
    })
    // @ts-expect-error - mocked
    globalThis.fetch = mockFetch

    const client = new PinataIPFSClient(undefined, undefined, 'https://gateway.example')
    const data = await client.retrieve('QmCID123')

    expect(data).toEqual({ retrieved: true })
    expect(mockFetch).toHaveBeenCalledWith('https://gateway.example/ipfs/QmCID123')
  })
})
