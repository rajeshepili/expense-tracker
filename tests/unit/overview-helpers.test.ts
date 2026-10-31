import { describe, expect, it } from 'vitest'
import { quietDelta } from '#/lib/overview-helpers'

describe('quietDelta', () => {
  it('never renders a misleading percent when prior month was 0', () => {
    expect(quietDelta(0, 0)).toBe('no activity yet')
    expect(quietDelta(120, 0)).toBe('first month tracked')
    // The old behavior rendered "−100% vs prior" for (0, 0) — guard against regression.
    expect(quietDelta(0, 0)).not.toContain('%')
  })

  it('keeps real comparisons for non-zero prior', () => {
    expect(quietDelta(150, 100)).toBe('+50% vs prior')
    expect(quietDelta(50, 100)).toBe('−50% vs prior')
    expect(quietDelta(100, 100)).toBe('same as prior')
  })
})
