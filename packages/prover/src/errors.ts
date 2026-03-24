export class ProverError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ProverError'
  }
}

export class CircuitNotFoundError extends ProverError {
  constructor(circuitId: string) {
    super('CIRCUIT_NOT_FOUND', `Circuit not found: ${circuitId}`, 404)
  }
}

export class ProofGenerationError extends ProverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROOF_GENERATION_FAILED', message, 500, details)
  }
}

export class ProofVerificationError extends ProverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROOF_VERIFICATION_FAILED', message, 500, details)
  }
}

export class ValidationError extends ProverError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class WorkerPoolError extends ProverError {
  constructor(message: string) {
    super('WORKER_POOL_ERROR', message, 503)
  }
}
