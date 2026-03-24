import { describe, it, expect } from 'vitest'
import { CircuitManager } from '../src/circuits.js'
import { CircuitNotFoundError } from '../src/errors.js'

describe('CircuitManager', () => {
  it('initializes without errors when circuit dir does not exist', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    expect(mgr.loadedCount).toBe(0)
  })

  it('returns all circuit metadata with available=false when no artifacts', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    const circuits = mgr.getAvailableCircuits()
    expect(circuits).toHaveLength(4)
    for (const c of circuits) {
      expect(c.available).toBe(false)
      expect(c.version).toBe('1.0.0')
    }
  })

  it('returns metadata for known circuits', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()

    const mb = mgr.getMetadata('MandateBound')
    expect(mb).toBeDefined()
    expect(mb!.name).toBe('Mandate Bound')
    expect(mb!.constraintCount).toBe(350)
    expect(mb!.publicInputs).toEqual(['commitment', 'proposed'])
    expect(mb!.privateInputs).toEqual(['max_value', 'randomness'])

    const pr = mgr.getMetadata('ParameterRange')
    expect(pr).toBeDefined()
    expect(pr!.constraintCount).toBe(550)

    const cf = mgr.getMetadata('CredentialFreshness')
    expect(cf).toBeDefined()
    expect(cf!.constraintCount).toBe(430)

    const ib = mgr.getMetadata('IdentityBinding')
    expect(ib).toBeDefined()
    expect(ib!.constraintCount).toBe(1200)
  })

  it('returns undefined for unknown circuit metadata', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    expect(mgr.getMetadata('Unknown')).toBeUndefined()
  })

  it('throws CircuitNotFoundError for unavailable circuits', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    expect(() => mgr.getArtifacts('MandateBound')).toThrow(CircuitNotFoundError)
  })

  it('hasCircuit returns false for unloaded circuits', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    expect(mgr.hasCircuit('MandateBound')).toBe(false)
  })

  it('throws CircuitNotFoundError for getVerificationKey on unavailable circuit', async () => {
    const mgr = new CircuitManager('./nonexistent-circuits')
    await mgr.initialize()
    expect(() => mgr.getVerificationKey('MandateBound')).toThrow(CircuitNotFoundError)
  })
})
