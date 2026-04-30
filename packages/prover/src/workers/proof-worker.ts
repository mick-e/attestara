/**
 * Worker thread for CPU-bound ZK proof generation using snarkjs.
 * Receives proof generation tasks via parentPort and returns results.
 */
import { parentPort } from 'worker_threads'

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

async function generateProof(task: ProofTask): Promise<ProofTaskResult> {
  const start = Date.now()
  try {
    const snarkjs = await import('snarkjs')
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      task.inputs!,
      task.wasmPath!,
      task.zkeyPath!,
    )
    return {
      taskId: task.taskId,
      success: true,
      proof,
      publicSignals,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      taskId: task.taskId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    }
  }
}

async function verifyProof(task: ProofTask): Promise<ProofTaskResult> {
  const start = Date.now()
  try {
    const snarkjs = await import('snarkjs')
    const valid = await snarkjs.groth16.verify(
      task.verificationKey!,
      task.publicSignals!,
      task.proof,
    )
    return {
      taskId: task.taskId,
      success: true,
      valid,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      taskId: task.taskId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    }
  }
}

if (parentPort) {
  parentPort.on('message', async (task: ProofTask) => {
    let result: ProofTaskResult
    if (task.type === 'generate') {
      result = await generateProof(task)
    } else if (task.type === 'verify') {
      result = await verifyProof(task)
    } else {
      result = {
        taskId: task.taskId,
        success: false,
        error: `Unknown task type: ${task.type}`,
        durationMs: 0,
      }
    }
    parentPort!.postMessage(result)
  })
}
