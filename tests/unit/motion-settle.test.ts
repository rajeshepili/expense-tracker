import { describe, expect, it } from 'vitest'
import { settleSpring } from '#/lib/motion'

describe('settle motion presets', () => {
  it('uses a critically damped spring (no bounce)', () => {
    expect(settleSpring.type).toBe('spring')
    expect(settleSpring.bounce).toBe(0)
    expect(settleSpring.duration).toBeGreaterThanOrEqual(0.3)
    expect(settleSpring.duration).toBeLessThanOrEqual(0.5)
  })
})
