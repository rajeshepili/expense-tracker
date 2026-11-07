import { prefersReducedMotion } from './reduced'
import {
  startVT,
  activeViewTransition,
  clearRouteVtDirection,
  clearMonthVtDirection,
} from './vt'
import type { MonthDirection } from './directions'

export type MotionPhase =
  'idle' | 'page' | 'month' | 'theme' | 'settle' | 'overlay'

export type MotionBlocker = 'modal' | 'drawer' | 'alert' | 'tour' | 'busy'

export type MotionKind =
  'pageEnter' | 'overlay' | 'listFlip' | 'dataTween' | 'hotkey' | 'navigate'

const SETTLE_BUDGET_MS = 420
const SAFETY_MS = 1200

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement
}

type Listener = () => void

const state = {
  phase: 'idle' as MotionPhase,
  blockers: new Set<MotionBlocker>(),
  listeners: new Set<Listener>(),
  idleWaiters: [] as Array<() => void>,
  navTokens: new Map<string, number>(),
  settleTimer: 0,
  safetyTimer: 0,
}

function setPhase(phase: MotionPhase) {
  state.phase = phase
  const r = root()
  if (r) {
    if (phase === 'idle') delete r.dataset.motion
    else r.dataset.motion = phase
  }
  state.listeners.forEach((l) => l())
  if (phase === 'idle') {
    state.idleWaiters.splice(0).forEach((resolve) => resolve())
  }
}

function notify() {
  state.listeners.forEach((l) => l())
}

function clearTimers() {
  if (state.settleTimer) {
    window.clearTimeout(state.settleTimer)
    state.settleTimer = 0
  }
  if (state.safetyTimer) {
    window.clearTimeout(state.safetyTimer)
    state.safetyTimer = 0
  }
}

function busyForIdle(): boolean {
  return (
    state.phase === 'page' ||
    state.phase === 'month' ||
    state.phase === 'theme' ||
    Boolean(activeViewTransition())
  )
}

/** Hold name stamps until VT finished (~duration-page if handle missing). */
const PAGE_VT_MS = 320

/** After route VT: settle stagger once, then idle. Not used for month. */
function releasePage(vt: ViewTransition | null) {
  clearTimers()
  const finish = vt
    ? Promise.resolve(vt.finished).catch(() => {})
    : new Promise<void>((resolve) => {
        window.setTimeout(resolve, PAGE_VT_MS)
      })
  void finish.then(() => {
    clearRouteVtDirection()
    if (state.phase !== 'page') return
    setPhase('settle')
    state.settleTimer = window.setTimeout(() => {
      if (state.phase === 'settle') setPhase('idle')
    }, SETTLE_BUDGET_MS)
  })
}

function releaseMonth(vt: ViewTransition | null) {
  clearTimers()
  const finish = vt
    ? Promise.resolve(vt.finished).catch(() => {})
    : new Promise<void>((resolve) => {
        window.setTimeout(resolve, PAGE_VT_MS)
      })
  void finish.then(() => {
    clearMonthVtDirection()
    if (state.phase === 'month') setPhase('idle')
  })
}

export const motion = {
  phase(): MotionPhase {
    return state.phase
  },

  blockers(): ReadonlySet<MotionBlocker> {
    return state.blockers
  },

  subscribe(listener: Listener): () => void {
    state.listeners.add(listener)
    return () => state.listeners.delete(listener)
  },

  can(kind: MotionKind): boolean {
    const busy =
      state.phase === 'page' ||
      state.phase === 'month' ||
      state.phase === 'theme' ||
      state.phase === 'overlay'
    switch (kind) {
      case 'overlay':
        return (
          state.phase !== 'page' &&
          state.phase !== 'month' &&
          state.phase !== 'theme' &&
          !activeViewTransition()
        )
      case 'pageEnter':
        return state.phase === 'idle' || state.phase === 'settle'
      case 'listFlip':
        return !busy && state.phase !== 'settle'
      case 'dataTween':
        return !busy && !activeViewTransition()
      case 'hotkey':
      case 'navigate':
        return state.blockers.size === 0
      default:
        return true
    }
  },

  awaitIdle(): Promise<void> {
    if (prefersReducedMotion()) return Promise.resolve()
    if (!busyForIdle()) return Promise.resolve()
    return new Promise((resolve) => {
      state.idleWaiters.push(resolve)
      window.setTimeout(resolve, SAFETY_MS)
    })
  },

  /** Route tab change — settle after VT. */
  trackPage(vt?: ViewTransition | null): void {
    if (prefersReducedMotion()) {
      setPhase('idle')
      return
    }
    setPhase('page')
    const v = vt ?? activeViewTransition()
    releasePage(v)
    state.safetyTimer = window.setTimeout(() => {
      if (state.phase === 'page') releasePage(null)
    }, SAFETY_MS)
  },

  /** Month change without the route shell slide. */
  month(
    update: () => void,
    direction: MonthDirection,
  ): ViewTransition | undefined {
    if (prefersReducedMotion() || typeof document === 'undefined') {
      update()
      return undefined
    }
    if (
      state.phase === 'page' ||
      state.phase === 'theme' ||
      state.phase === 'month' ||
      activeViewTransition()
    ) {
      update()
      return undefined
    }

    setPhase('month')
    const vt = startVT({ update, kind: 'month', direction })
    releaseMonth(vt ?? null)
    state.safetyTimer = window.setTimeout(() => {
      if (state.phase === 'month') setPhase('idle')
    }, SAFETY_MS)
    return vt
  },

  async beginTheme(update: () => void): Promise<void> {
    if (
      prefersReducedMotion() ||
      state.phase === 'page' ||
      state.phase === 'month' ||
      activeViewTransition()
    ) {
      update()
      return
    }
    if (state.phase === 'theme') {
      update()
      return
    }
    if (typeof document === 'undefined') {
      update()
      return
    }
    setPhase('theme')
    const vt = startVT({ update, kind: 'theme' })
    void Promise.resolve(vt?.finished)
      .catch(() => {})
      .then(() => {
        if (state.phase === 'theme') setPhase('idle')
      })
    state.safetyTimer = window.setTimeout(() => {
      if (state.phase === 'theme') setPhase('idle')
    }, SAFETY_MS)
  },

  async openOverlay(kind: MotionBlocker): Promise<void> {
    await motion.awaitIdle()
    state.blockers.add(kind)
    if (state.phase === 'idle' || state.phase === 'settle') {
      setPhase('overlay')
    }
    notify()
  },

  closeOverlay(kind: MotionBlocker): void {
    state.blockers.delete(kind)
    if (state.blockers.size === 0 && state.phase === 'overlay') setPhase('idle')
    notify()
  },

  coalesceNavigate(key: string, run: () => Promise<void>): Promise<void> {
    const token = (state.navTokens.get(key) ?? 0) + 1
    state.navTokens.set(key, token)
    return run().then(() => {
      if (state.navTokens.get(key) === token) state.navTokens.delete(key)
    })
  },

  reduced(): boolean {
    return prefersReducedMotion()
  },
}
