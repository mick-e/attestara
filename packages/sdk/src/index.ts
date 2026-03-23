// @agentclear/sdk — TypeScript SDK for AgentClear protocol
export { DIDManager } from './identity/index.js'
export type { CreateDIDResult } from './identity/index.js'

export { CredentialManager, MemoryIPFSClient, PinataIPFSClient } from './credentials/index.js'
export type { IPFSClient } from './credentials/ipfs.js'
export { AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from './credentials/schemas.js'

export { ProverManager } from './prover/index.js'
export type { Prover } from './prover/index.js'
export { LocalProver } from './prover/local.js'
export { RemoteProver } from './prover/remote.js'
export { TestProver } from './testing/test-prover.js'

export { SessionManager, NegotiationSession, MerkleAccumulator } from './negotiation/index.js'
export { createTurn, validateTurn, hashTurn } from './negotiation/turn.js'
