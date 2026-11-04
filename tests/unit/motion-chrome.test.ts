import { describe, expect, it } from 'vitest'
import { chromeReduced, chromeSpring } from '#/lib/motion'

describe('chrome spring presets', () => {
  it('uses critically damped spring (bounce 0) for frequent chrome', () => {
    expect(chromeSpring).toEqual({
      type: 'spring',
      duration: 0.35,
      bounce: 0,
    })
  })

  it('PRM chrome path is brief opacity (~80ms), not a spring', () => {
    expect(chromeReduced.duration).toBe(0.08)
    expect(chromeReduced).not.toHaveProperty('bounce')
    expect(chromeReduced).not.toHaveProperty('type')
  })
})
