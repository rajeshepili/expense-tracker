/** Chrome spring (bounce 0). */
export const chromeSpring = {
  type: 'spring' as const,
  duration: 0.35,
  bounce: 0,
}

/** Reduced-motion chrome timing. */
export const chromeReduced = {
  duration: 0.08,
  ease: 'linear' as const,
}
