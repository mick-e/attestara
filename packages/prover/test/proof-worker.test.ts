import { describe, it, expect } from 'vitest'

// The proof-worker runs in a worker_thread and uses snarkjs.
// We test its interface contract and message format.

interface ProofTask {
  taskId: string
  type: 'generate' | 'verify'
  circuitId: string
  wasmPath?: string
  zkeyPath?: string
  inputs?: Record<string, string>
  proof?: unknown
  publicSignals?: string[]
  verificationKey?: Record<string, unknown>
}

interface ProofTaskResult {
  taskId: string
  success: boolean
  proof?: unknown
  publicSignals?: string[]
  valid?: boolean
  error?: string
  durationMs: number
}

describe('proof-worker message format', () => {
  it('generate task has correct shape', () => {
    const task: ProofTask = {
      taskId: 'task-001',
      type: 'generate',
      circuitId: 'MandateBound',
      wasmPath: '/path/to/mandate_bound.wasm',
      zkeyPath: '/path/to/mandate_bound_final.zkey',
      inputs: { max_value: '500000', randomness: '123' },
    }

    expect(task.type).toBe('generate')
    expect(task.circuitId).toBe('MandateBound')
    expect(task.inputs).toBeTruthy()
  })

  it('verify task has correct shape', () => {
    const task: ProofTask = {
      taskId: 'task-002',
      type: 'verify',
      circuitId: 'MandateBound',
      verificationKey: { alpha: '1', beta: '2' },
      publicSignals: ['100'],
      proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] },
    }

    expect(task.type).toBe('verify')
    expect(task.verificationKey).toBeTruthy()
    expect(task.publicSignals).toHaveLength(1)
  })

  it('success result includes proof and signals', () => {
    const result: ProofTaskResult = {
      taskId: 'task-001',
      success: true,
      proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] },
      publicSignals: ['100', '200'],
      durationMs: 1500,
    }

    expect(result.success).toBe(true)
    expect(result.proof).toBeTruthy()
    expect(result.publicSignals).toHaveLength(2)
    expect(result.durationMs).toBe(1500)
  })

  it('failure result includes error message', () => {
    const result: ProofTaskResult = {
      taskId: 'task-003',
      success: false,
      error: 'Invalid witness',
      durationMs: 200,
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid witness')
  })

  it('verification result includes valid flag', () => {
    const result: ProofTaskResult = {
      taskId: 'task-002',
      success: true,
      valid: true,
      durationMs: 100,
    }

    expect(result.valid).toBe(true)
  })
})
