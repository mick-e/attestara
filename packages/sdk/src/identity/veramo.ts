import { createAgent } from '@veramo/core'
import { DIDManager as VeramoDIDManager } from '@veramo/did-manager'
import { MemoryDIDStore } from '@veramo/did-manager'
import { EthrDIDProvider } from '@veramo/did-provider-ethr'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager'
import { KeyManagementSystem } from '@veramo/kms-local'
import { Resolver } from 'did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import type { NetworkConfig } from '@attestara/types'

export function createVeramoAgent(config: NetworkConfig) {
  const rpcUrl = Array.isArray(config.rpcUrl) ? (config.rpcUrl[0] ?? 'http://localhost:8545') : config.rpcUrl

  return createAgent({
    plugins: [
      new KeyManager({
        store: new MemoryKeyStore(),
        kms: {
          local: new KeyManagementSystem(new MemoryPrivateKeyStore()),
        },
      }),
      new VeramoDIDManager({
        store: new MemoryDIDStore(),
        defaultProvider: 'did:ethr',
        providers: {
          'did:ethr': new EthrDIDProvider({
            defaultKms: 'local',
            network: config.chain === 'local' ? 'development' : config.chain,
            rpcUrl,
          }),
        },
      }),
      new DIDResolverPlugin({
        resolver: new Resolver(
          ethrDidResolver({ networks: [{ name: 'development', rpcUrl }] })
        ),
      }),
    ],
  })
}
