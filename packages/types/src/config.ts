export interface AgentClearConfig {
  agent: {
    did: string
    keyFile: string
    credentialFile?: string
  }
  network: NetworkConfig
  prover: ProverConfig
  relay?: {
    url: string
    apiKey?: string
  }
}

export interface NetworkConfig {
  chain: 'local' | 'arbitrum-sepolia' | 'arbitrum-one'
  rpcUrl: string | string[]
  contracts?: {
    agentRegistry: string
    credentialRegistry: string
    commitmentContract: string
  }
}

export interface ProverConfig {
  mode: 'local' | 'remote'
  remoteUrl?: string
  circuitDir?: string
}
