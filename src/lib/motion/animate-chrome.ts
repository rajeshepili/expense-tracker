import { animate } from 'motion'
import type { AnimationPlaybackControls, DOMKeyframesDefinition } from 'motion'
import { prefersReducedMotion } from './reduced'
import { chromeReduced, chromeSpring } from './spring'

const runs = new WeakMap<Element, AnimationPlaybackControls>()

export type ChromeKeyframes = DOMKeyframesDefinition

/** Retarget without stop() so the spring keeps velocity. */
export function animateChrome(
  el: Element,
  keyframes: ChromeKeyframes,
  options?: Parameters<typeof animate>[2],
): AnimationPlaybackControls {
  if (prefersReducedMotion()) {
    runs.get(el)?.stop()
    const controls = animate(el, keyframes, { ...chromeReduced, ...options })
    runs.set(el, controls)
    return controls
  }

  const controls = animate(el, keyframes, { ...chromeSpring, ...options })
  runs.set(el, controls)
  return controls
}

export function snapChrome(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration> & Record<string, string>,
) {
  runs.get(el)?.stop()
  runs.delete(el)
  Object.assign(el.style, styles)
}
