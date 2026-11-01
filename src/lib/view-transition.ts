/**
 * Thin wrapper around document.startViewTransition with the app's standard
 * guards: no-op on the server, unsupported browsers, and reduced-motion.
 * `types` are forwarded for directional animations (see ::view-transition-*
 * rules in styles/50-view-transitions.css). Returns the ViewTransition (or
 * undefined) so callers can hook .ready/.finished if needed.
 */
export function withViewTransition(
  update: () => void,
  types?: string[],
  /** Keyframe names for the old/new layers, set as custom props on <html>. */
  keyframes?: { out: string; in: string },
): ViewTransition | undefined {
  if (typeof document === 'undefined') {
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
    return undefined
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return undefined
  }
  const root = document.documentElement
  if (keyframes) {
    root.style.setProperty('--month-vt-out', keyframes.out)
    root.style.setProperty('--month-vt-in', keyframes.in)
    window.setTimeout(() => {
      root.style.removeProperty('--month-vt-out')
      root.style.removeProperty('--month-vt-in')
    }, 400)
  }
  return doc.startViewTransition(types ? { update, types } : update)
}
