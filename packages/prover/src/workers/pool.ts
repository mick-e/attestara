import { Worker } from 'worker_threads'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { WorkerPoolError, ProofGenerationError, ProofVerificationError } from '../errors.js'

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

interface PendingTask {
  resolve: (result: ProofTaskResult) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface PoolWorker {
  worker: Worker
  busy: boolean
}

const TASK_TIMEOUT_MS = 30_000 // 30 seconds per proof generation

export class WorkerPool {
  private workers: PoolWorker[] = []
  private taskQueue: Array<{ task: ProofTask; pending: PendingTask }> = []
  private pendingTasks = new Map<string, PendingTask>()
  private workerScript: string
  private shuttingDown = false

  constructor(
    private poolSize: number,
    workerScriptOverride?: string,
  ) {
    // Resolve the proof-worker.ts path relative to this file
    const currentDir = dirname(fileURLToPath(import.meta.url))
    this.workerScript = workerScriptOverride ?? join(currentDir, 'proof-worker.ts')
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.poolSize; i++) {
      this.spawnWorker()
    }
  }

  private spawnWorker(): void {
    const worker = new Worker(this.workerScript, {
      execArgv: ['--import', 'tsx'],
    })

    const poolWorker: PoolWorker = { worker, busy: false }

    worker.on('message', (result: ProofTaskResult) => {
      poolWorker.busy = false
      const pending = this.pendingTasks.get(result.taskId)
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingTasks.delete(result.taskId)
        pending.resolve(result)
      }
      this.processQueue()
    })

    worker.on('error', (err) => {
      poolWorker.busy = false
      // Fail any pending tasks for this worker
      this.processQueue()
    })

    worker.on('exit', (code) => {
      const idx = this.workers.indexOf(poolWorker)
      if (idx !== -1) this.workers.splice(idx, 1)
      // Respawn if not shutting down
      if (!this.shuttingDown && this.workers.length < this.poolSize) {
        this.spawnWorker()
      }
    })

    this.workers.push(poolWorker)
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return
    const available = this.workers.find(w => !w.busy)
    if (!available) return

    const next = this.taskQueue.shift()!
    available.busy = true
    this.pendingTasks.set(next.task.taskId, next.pending)
    available.worker.postMessage(next.task)
  }

  async submitProofGeneration(
    circuitId: string,
    wasmPath: string,
    zkeyPath: string,
    inputs: Record<string, string>,
  ): Promise<{ proof: unknown; publicSignals: string[]; durationMs: number }> {
    if (this.shuttingDown) {
      throw new WorkerPoolError('Worker pool is shutting down')
    }

    const taskId = randomUUID()
    const task: ProofTask = {
      taskId,
      type: 'generate',
      circuitId,
      wasmPath,
      zkeyPath,
      inputs,
    }

    const result = await this.submitTask(task)

    if (!result.success) {
      throw new ProofGenerationError(result.error ?? 'Unknown proof generation error', { circuitId })
    }

    return {
      proof: result.proof!,
      publicSignals: result.publicSignals!,
      durationMs: result.durationMs,
    }
  }

  async submitProofVerification(
    circuitId: string,
    verificationKey: Record<string, unknown>,
    publicSignals: string[],
    proof: unknown,
  ): Promise<{ valid: boolean; durationMs: number }> {
    if (this.shuttingDown) {
      throw new WorkerPoolError('Worker pool is shutting down')
    }

    const taskId = randomUUID()
    const task: ProofTask = {
      taskId,
      type: 'verify',
      circuitId,
      verificationKey,
      publicSignals,
      proof,
    }

    const result = await this.submitTask(task)

    if (!result.success) {
      throw new ProofVerificationError(result.error ?? 'Unknown verification error', { circuitId })
    }

    return {
      valid: result.valid!,
      durationMs: result.durationMs,
    }
  }

  private submitTask(task: ProofTask): Promise<ProofTaskResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingTasks.delete(task.taskId)
        reject(new ProofGenerationError(`Task timed out after ${TASK_TIMEOUT_MS}ms`, { taskId: task.taskId }))
      }, TASK_TIMEOUT_MS)

      const pending: PendingTask = { resolve, reject, timer }
      const available = this.workers.find(w => !w.busy)

      if (available) {
        available.busy = true
        this.pendingTasks.set(task.taskId, pending)
        available.worker.postMessage(task)
      } else {
        this.taskQueue.push({ task, pending })
      }
    })
  }

  get activeWorkers(): number {
    return this.workers.length
  }

  get busyWorkers(): number {
    return this.workers.filter(w => w.busy).length
  }

  get queuedTasks(): number {
    return this.taskQueue.length
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true

    // Clear queued tasks
    for (const { pending } of this.taskQueue) {
      clearTimeout(pending.timer)
      pending.reject(new WorkerPoolError('Worker pool shutting down'))
    }
    this.taskQueue = []

    // Terminate workers
    await Promise.allSettled(
      this.workers.map(w => w.worker.terminate()),
    )
    this.workers = []
  }
}
