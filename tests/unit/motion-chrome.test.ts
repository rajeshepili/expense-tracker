import { describe, expect, it } from 'vitest'
import { chromeReduced, chromeSpring } from '#/lib/motion'

describe('chrome spring presets', () => {
  it('uses physics spring (critically damped) so retargets keep velocity', () => {
    expect(chromeSpring.type).toBe('spring')
    expect(chromeSpring.stiffness).toBeGreaterThan(0)
    expect(chromeSpring.damping).toBeGreaterThan(0)
    expect(chromeSpring.mass).toBeGreaterThan(0)
    // duration/bounce springs drop velocity on interrupt — must not use them.
    expect(chromeSpring).not.toHaveProperty('duration')
    expect(chromeSpring).not.toHaveProperty('bounce')
    const ratio =
      chromeSpring.damping /
      (2 * Math.sqrt(chromeSpring.stiffness * chromeSpring.mass))
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.15)
  })

  it('PRM chrome path is brief opacity (~80ms), not a spring', () => {
    expect(chromeReduced.duration).toBe(0.08)
    expect(chromeReduced).not.toHaveProperty('bounce')
    expect(chromeReduced).not.toHaveProperty('type')
  })
})
