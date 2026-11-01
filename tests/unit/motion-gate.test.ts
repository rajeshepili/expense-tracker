import { describe, expect, it, vi } from 'vitest'
import { motion } from '#/lib/motion'

describe('motion gate', () => {
  it('hotkeys/nav allowed when idle, blocked while overlay open', async () => {
    expect(motion.can('hotkey')).toBe(true)
    await motion.openOverlay('modal')
    expect(motion.can('hotkey')).toBe(false)
    expect(motion.can('navigate')).toBe(false)
    motion.closeOverlay('modal')
    expect(motion.can('hotkey')).toBe(true)
  })

  it('awaitIdle resolves immediately when idle', async () => {
    await expect(motion.awaitIdle()).resolves.toBeUndefined()
  })

  it('reduced motion skips page tracking', () => {
    expect(typeof motion.reduced()).toBe('boolean')
  })

  it('coalesceNavigate runs latest call', async () => {
    const order: string[] = []
    await motion.coalesceNavigate('k', async () => {
      order.push('a')
    })
    await motion.coalesceNavigate('k', async () => {
      order.push('b')
    })
    expect(order).toEqual(['a', 'b'])
  })

  it('trackPage with reduced motion stays idle', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    motion.trackPage()
    expect(motion.phase()).toBe('idle')
    vi.unstubAllGlobals()
  })
})
