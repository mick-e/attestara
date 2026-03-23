import { createHash } from 'crypto'

export class MerkleAccumulator {
  private leaves: string[] = []

  addLeaf(data: string): void {
    this.leaves.push(this.hash(data))
  }

  getRoot(): string {
    if (this.leaves.length === 0) return '0x' + '0'.repeat(64)
    let layer = [...this.leaves]
    while (layer.length > 1) {
      const next: string[] = []
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i]
        const right = layer[i + 1] || left
        next.push(this.hash(left + right))
      }
      layer = next
    }
    return layer[0]
  }

  get leafCount(): number {
    return this.leaves.length
  }

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex')
  }
}
