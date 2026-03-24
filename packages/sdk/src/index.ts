// @attestara/sdk — TypeScript SDK for Attestara protocol
export { AttestaraClient } from './client.js'

export { DIDManager } from './identity/index.js'
export type { CreateDIDResult } from './identity/index.js'

export { CredentialManager, MemoryIPFSClient, PinataIPFSClient } from './credentials/index.js'
export type { IPFSClient } from './credentials/ipfs.js'
export { AGENT_AUTHORITY_CREDENTIAL_TYPE, CREDENTIAL_CONTEXT } from './credentials/schemas.js'

export { ProverManager } from './prover/index.js'
export type { Prover, BundleProofRequest } from './prover/index.js'
export { LocalProver } from './prover/local.js'
export { RemoteProver } from './prover/remote.js'

export { SessionManager, NegotiationSession, MerkleAccumulator } from './negotiation/index.js'
export { createTurn, validateTurn, hashTurn } from './negotiation/turn.js'

export { CommitmentManager } from './commitment/index.js'
export type { CommitmentFilter } from './commitment/index.js'
export { ChainCommitmentClient } from './commitment/chain.js'

export { RuleBasedStrategy, LLMStrategy, ScriptedStrategy } from './agents/strategy.js'
export type { NegotiationStrategy } from './agents/strategy.js'

export { TestProver, MockAgent, LocalChain, TestCredentials, SessionRecorder } from './testing/index.js'
export type { MockAgentOptions, RecordedEvent } from './testing/index.js'
