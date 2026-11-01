
export type MotionPhase = 'idle' | 'page' | 'theme' | 'settle' | 'overlay'
export type MotionBlocker = 'modal' | 'drawer' | 'alert' | 'tour' | 'busy'

export type MotionKind =
  | 'pageEnter'
  | 'overlay'
  | 'listFlip'
  | 'dataTween'
  | 'hotkey'
  | 'navigate'

const SETTLE_BUDGET_MS = 420
const SAFETY_MS = 1200

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
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

function activeVT(): ViewTransition | null {
  if (typeof document === 'undefined') return null
  const doc = document as Document & { activeViewTransition?: ViewTransition | null }
  return doc.activeViewTransition ?? null
}

function releasePage(vt: ViewTransition | null) {
  clearTimers()
  const finish = vt
    ? Promise.resolve(vt.finished).catch(() => {})
    : Promise.resolve()
  void finish.then(() => {
    if (state.phase !== 'page') return
    setPhase('settle')
    state.settleTimer = window.setTimeout(() => {
      if (state.phase === 'settle') setPhase('idle')
    }, SETTLE_BUDGET_MS)
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
    const b = state.blockers
    switch (kind) {
      case 'overlay':
        return state.phase !== 'page' && state.phase !== 'theme' && !activeVT()
      case 'pageEnter':
        return state.phase === 'idle' || state.phase === 'settle'
      case 'listFlip':
        return state.phase !== 'page' && state.phase !== 'overlay'
      case 'dataTween':
        return state.phase !== 'page' && !activeVT()
      case 'hotkey':
      case 'navigate':
        return b.size === 0
      default:
        return true
    }
  },

  awaitIdle(): Promise<void> {
    if (prefersReducedMotion()) return Promise.resolve()
    if (state.phase !== 'page' && state.phase !== 'theme' && !activeVT()) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      state.idleWaiters.push(resolve)
      window.setTimeout(resolve, SAFETY_MS)
    })
  },

  trackPage(vt?: ViewTransition | null): void {
    if (prefersReducedMotion()) {
      setPhase('idle')
      return
    }
    setPhase('page')
    const v = vt ?? activeVT()
    releasePage(v)
    state.safetyTimer = window.setTimeout(() => {
      if (state.phase === 'page') releasePage(null)
    }, SAFETY_MS)
  },

  async beginPage(
    update: () => void,
    opts?: { types?: string[] },
  ): Promise<ViewTransition | undefined> {
    if (prefersReducedMotion() || typeof document === 'undefined') {
      update()
      setPhase('idle')
      return undefined
    }
    if (state.phase === 'page' || state.phase === 'theme' || activeVT()) {
      update()
      return undefined
    }
    const doc = document as Document & {
      startViewTransition?: (
        cb: (() => void) | { update: () => void; types: string[] },
      ) => ViewTransition
    }
    if (typeof doc.startViewTransition !== 'function') {
      update()
      setPhase('idle')
      return undefined
    }
    setPhase('page')
    const vt = doc.startViewTransition(
      opts?.types ? { update, types: opts.types } : update,
    )
    releasePage(vt)
    state.safetyTimer = window.setTimeout(() => {
      if (state.phase === 'page') releasePage(null)
    }, SAFETY_MS)
    return vt
  },

  async beginTheme(update: () => void): Promise<void> {
    if (prefersReducedMotion() || state.phase === 'page' || activeVT()) {
      update()
      return
    }
    if (state.phase === 'theme') {
      update()
      return
    }
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => ViewTransition
    }
    if (
      typeof document === 'undefined' ||
      typeof doc.startViewTransition !== 'function'
    ) {
      update()
      return
    }
    setPhase('theme')
    const vt = doc.startViewTransition(update)
    void Promise.resolve(vt.finished)
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
    if (state.phase === 'idle') setPhase('overlay')
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
