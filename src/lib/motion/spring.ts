/**
 * Critically damped chrome springs (Apple fluid interfaces / HIG motion).
 * bounce: 0 = no overshoot on frequent chrome (tab pill, etc.).
 */
export const chromeSpring = {
  type: 'spring' as const,
  duration: 0.35,
  bounce: 0,
}

/** PRM path: brief opacity / snap — HIG “Make motion optional.” */
export const chromeReduced = {
  duration: 0.08,
  ease: 'linear' as const,
}
