export interface AttestaraConfig {
  agent: {
    did: string
    keyFile: string
    credentialFile?: string | undefined
  }
  network: NetworkConfig
  prover: ProverConfig
  relay?: {
    url: string
    apiKey?: string | undefined
  } | undefined
}

export interface NetworkConfig {
  chain: 'local' | 'arbitrum-sepolia' | 'arbitrum-one'
  rpcUrl: string | string[]
  contracts?: {
    agentRegistry: string
    credentialRegistry: string
    commitmentContract: string
  } | undefined
}

export interface ProverConfig {
  mode: 'local' | 'remote'
  remoteUrl?: string | undefined
  circuitDir?: string | undefined
}
