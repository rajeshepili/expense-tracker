import { prefersReducedMotion } from './reduced'
import type { MonthDirection } from './directions'

export type VtKind = 'page' | 'month' | 'theme'

type StartVtArgs = {
  update: () => void
  kind: VtKind
  /** Month only — stamps html[data-vt-month] → month-forward|month-back names. */
  direction?: MonthDirection
}

/**
 * Stamp route VT name via html[data-vt-route]. CSS maps that to
 * view-transition-name: page-forward | page-back on .page-content.
 */
export function applyRouteVtDirection(back: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.vtRoute = back ? 'back' : 'forward'
}

export function clearRouteVtDirection(): void {
  if (typeof document === 'undefined') return
  delete document.documentElement.dataset.vtRoute
}

export function applyMonthVtDirection(direction: MonthDirection): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.vtMonth =
    direction === 'month-back' ? 'back' : 'forward'
}

export function clearMonthVtDirection(): void {
  if (typeof document === 'undefined') return
  delete document.documentElement.dataset.vtMonth
}

/** Shared startViewTransition entry (month / theme). Route tabs use navigateAfterPrefetch. */
export function startVT(args: StartVtArgs): ViewTransition | undefined {
  const { update, direction } = args
  if (typeof document === 'undefined') {
    update()
    return undefined
  }
  if (prefersReducedMotion()) {
    update()
    return undefined
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => ViewTransition
  }
  if (typeof doc.startViewTransition !== 'function') {
    update()
    return undefined
  }

  if (direction) applyMonthVtDirection(direction)

  return doc.startViewTransition(update)
}

export function activeViewTransition(): ViewTransition | null {
  if (typeof document === 'undefined') return null
  const doc = document as Document & {
    activeViewTransition?: ViewTransition | null
  }
  return doc.activeViewTransition ?? null
}
