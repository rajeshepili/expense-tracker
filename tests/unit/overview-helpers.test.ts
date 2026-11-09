import { describe, expect, it } from 'vitest'
import { priorDeltaLabel } from '#/lib/overview-helpers'

describe('priorDeltaLabel', () => {
  it('never renders a misleading percent when prior month was 0', () => {
    expect(priorDeltaLabel(0, 0)).toBe('no activity yet')
    expect(priorDeltaLabel(120, 0)).toBe('first month tracked')
    expect(priorDeltaLabel(0, 0)).not.toContain('%')
  })

  it('keeps real comparisons for non-zero prior', () => {
    expect(priorDeltaLabel(150, 100)).toBe('+50% vs prior')
    expect(priorDeltaLabel(50, 100)).toBe('−50% vs prior')
    expect(priorDeltaLabel(100, 100)).toBe('same as prior')
  })
})
