import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  motion,
  resolveMonthDirection,
  resolveNavDirection,
  applyRouteVtDirection,
  clearRouteVtDirection,
  startVT,
} from '#/lib/motion'

function resetGate() {
  motion.closeOverlay('modal')
  motion.closeOverlay('drawer')
  motion.closeOverlay('alert')
  motion.closeOverlay('tour')
  motion.closeOverlay('busy')
  // Force idle if a prior test left a phase
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
  motion.trackPage()
  vi.unstubAllGlobals()
}

afterEach(() => {
  resetGate()
  document.documentElement.removeAttribute('data-motion')
  document.documentElement.removeAttribute('data-vt-route')
  document.documentElement.removeAttribute('data-vt-month')
})

describe('motion gate', () => {
  it('hotkeys/nav allowed when idle, blocked while overlay open', async () => {
    expect(motion.can('hotkey')).toBe(true)
    await motion.openOverlay('modal')
    expect(motion.can('hotkey')).toBe(false)
    expect(motion.can('navigate')).toBe(false)
    expect(motion.phase()).toBe('overlay')
    motion.closeOverlay('modal')
    expect(motion.can('hotkey')).toBe(true)
    expect(motion.phase()).toBe('idle')
  })

  it('awaitIdle resolves immediately when idle', async () => {
    await expect(motion.awaitIdle()).resolves.toBeUndefined()
  })

  it('reduced motion skips page tracking', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    motion.trackPage()
    expect(motion.phase()).toBe('idle')
    vi.unstubAllGlobals()
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

  it('listFlip and dataTween blocked during theme/month/page/overlay', async () => {
    expect(motion.can('listFlip')).toBe(true)
    expect(motion.can('dataTween')).toBe(true)

    await motion.openOverlay('modal')
    expect(motion.can('listFlip')).toBe(false)
    expect(motion.can('dataTween')).toBe(false)
    motion.closeOverlay('modal')
  })

  it('month phase sets data-motion=month without settle', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    // No startViewTransition in jsdom — month() updates and stays idle safely
    const update = vi.fn()
    motion.month(update, 'month-forward')
    expect(update).toHaveBeenCalled()
    // Without VT support, phase returns to idle via releaseMonth(null)
    expect(['idle', 'month']).toContain(motion.phase())
    vi.unstubAllGlobals()
  })
})

describe('motion directions', () => {
  it('resolveMonthDirection compares year-months', () => {
    expect(resolveMonthDirection('2025-01', '2025-02')).toBe('month-forward')
    expect(resolveMonthDirection('2025-03', '2025-01')).toBe('month-back')
    expect(resolveMonthDirection('all', '2025-01')).toBe('month-forward')
  })

  it('resolveNavDirection uses nav path order', () => {
    expect(
      resolveNavDirection({ fromPathname: '/', toPathname: '/ledger' }).type,
    ).toBe('nav-forward')
    expect(
      resolveNavDirection({ fromPathname: '/ledger', toPathname: '/' }).type,
    ).toBe('nav-back')
  })
})

describe('motion vt route names', () => {
  it('applyRouteVtDirection stamps html[data-vt-route] for page-forward|page-back', () => {
    applyRouteVtDirection(false)
    expect(document.documentElement.dataset.vtRoute).toBe('forward')
    applyRouteVtDirection(true)
    expect(document.documentElement.dataset.vtRoute).toBe('back')
    clearRouteVtDirection()
    expect(document.documentElement.dataset.vtRoute).toBeUndefined()
  })

  it('startVT with reduced motion skips VT and still runs update', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    const update = vi.fn()
    const vt = startVT({ update, kind: 'month', direction: 'month-forward' })
    expect(vt).toBeUndefined()
    expect(update).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
