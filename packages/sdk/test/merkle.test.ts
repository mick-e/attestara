import { describe, it, expect } from 'vitest'
import { MerkleAccumulator } from '../src/negotiation/merkle.js'

/**
 * Focused tests for the MerkleAccumulator used by NegotiationSession to
 * build a tamper-evident log of turns.
 */

describe('MerkleAccumulator', () => {
  it('should return a 64-char zero root for an empty tree', () => {
    const m = new MerkleAccumulator()
    expect(m.leafCount).toBe(0)
    const root = m.getRoot()
    expect(root).toBe('0x' + '0'.repeat(64))
    expect(root).toHaveLength(66)
  })

  it('should produce a stable 64-char hex root for a single leaf', () => {
    const m = new MerkleAccumulator()
    m.addLeaf('turn-1')
    const root = m.getRoot()
    expect(root).toMatch(/^[0-9a-f]{64}$/)
    expect(m.leafCount).toBe(1)
  })

  it('should be deterministic for identical leaves', () => {
    const a = new MerkleAccumulator()
    const b = new MerkleAccumulator()
    ;['alpha', 'beta', 'gamma', 'delta'].forEach(l => {
      a.addLeaf(l)
      b.addLeaf(l)
    })
    expect(a.getRoot()).toBe(b.getRoot())
  })

  it('should change root when leaf order differs', () => {
    const a = new MerkleAccumulator()
    a.addLeaf('one')
    a.addLeaf('two')

    const b = new MerkleAccumulator()
    b.addLeaf('two')
    b.addLeaf('one')

    expect(a.getRoot()).not.toBe(b.getRoot())
  })

  it('should produce distinct roots as leaves accumulate', () => {
    const m = new MerkleAccumulator()
    const roots = new Set<string>()
    for (let i = 0; i < 8; i++) {
      m.addLeaf(`leaf-${i}`)
      roots.add(m.getRoot())
    }
    expect(roots.size).toBe(8)
    expect(m.leafCount).toBe(8)
  })

  it('should handle an odd number of leaves by duplicating the last one', () => {
    // Three leaves → last is duplicated at first layer. Verify output is
    // a valid 64-char hex string and differs from two-leaf root.
    const three = new MerkleAccumulator()
    three.addLeaf('a')
    three.addLeaf('b')
    three.addLeaf('c')
    expect(three.getRoot()).toMatch(/^[0-9a-f]{64}$/)

    const two = new MerkleAccumulator()
    two.addLeaf('a')
    two.addLeaf('b')
    expect(three.getRoot()).not.toBe(two.getRoot())
  })

  it('should keep leaf count accurate as items are added', () => {
    const m = new MerkleAccumulator()
    expect(m.leafCount).toBe(0)
    m.addLeaf('x')
    expect(m.leafCount).toBe(1)
    m.addLeaf('y')
    m.addLeaf('z')
    expect(m.leafCount).toBe(3)
  })
})
