import { createVeramoAgent } from './veramo.js'
import type { NetworkConfig } from '@attestara/types'

export interface CreateDIDResult {
  did: string
  publicKey: string
  keyFile: string
}

export class DIDManager {
  private agent: ReturnType<typeof createVeramoAgent>
  private config: NetworkConfig

  constructor(config: NetworkConfig) {
    this.config = config
    this.agent = createVeramoAgent(config)
  }

  async create(name: string): Promise<CreateDIDResult> {
    const identity = await this.agent.didManagerCreate({
      alias: name,
      provider: 'did:ethr',
      kms: 'local',
    })
    const keys = await this.agent.didManagerGet({ did: identity.did })
    return {
      did: identity.did,
      publicKey: keys.keys[0]?.publicKeyHex || '',
      keyFile: `keys/${name}.json`,
    }
  }

  async resolve(did: string): Promise<{ id: string; [key: string]: unknown }> {
    const result = await this.agent.resolveDid({ didUrl: did })
    return result.didDocument as { id: string; [key: string]: unknown }
  }

  async rotateKey(did: string): Promise<{ publicKey: string }> {
    const key = await this.agent.keyManagerCreate({
      kms: 'local',
      type: 'Secp256k1',
    })
    await this.agent.didManagerAddKey({
      did,
      key: { kid: key.kid, type: key.type, publicKeyHex: key.publicKeyHex },
    })
    return { publicKey: key.publicKeyHex }
  }
}
