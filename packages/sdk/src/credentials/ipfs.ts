export interface IPFSClient {
  store(data: unknown): Promise<string> // returns CID
  retrieve(cid: string): Promise<unknown>
}

export class PinataIPFSClient implements IPFSClient {
  constructor(
    private apiKey?: string,
    private apiSecret?: string,
    private gatewayUrl = 'http://localhost:8080',
  ) {}

  async store(data: unknown): Promise<string> {
    if (this.apiKey && this.apiSecret) {
      // Real Pinata upload
      const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret,
        },
        body: JSON.stringify({ pinataContent: data }),
      })
      const result = (await res.json()) as { IpfsHash: string }
      return result.IpfsHash
    }
    // Local IPFS node fallback
    const res = await fetch(`${this.gatewayUrl}/api/v0/add`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    const result = (await res.json()) as { Hash: string }
    return result.Hash
  }

  async retrieve(cid: string): Promise<unknown> {
    const res = await fetch(`${this.gatewayUrl}/ipfs/${cid}`)
    return res.json()
  }
}

// In-memory implementation for testing
export class MemoryIPFSClient implements IPFSClient {
  private storage: Map<string, unknown> = new Map()
  private counter = 0

  async store(data: unknown): Promise<string> {
    const cid = `Qm${(++this.counter).toString().padStart(44, '0')}`
    this.storage.set(cid, structuredClone(data))
    return cid
  }

  async retrieve(cid: string): Promise<unknown> {
    const data = this.storage.get(cid)
    if (!data) throw new Error(`CID not found: ${cid}`)
    return structuredClone(data)
  }
}
