import { animate } from 'motion'
import type { AnimationPlaybackControls, DOMKeyframesDefinition } from 'motion'
import { prefersReducedMotion } from './reduced'
import { chromeReduced, chromeSpring } from './spring'

const runs = new WeakMap<Element, AnimationPlaybackControls>()

export type ChromeKeyframes = DOMKeyframesDefinition

/**
 * Imperative chrome animation that cancels any in-flight run on the same node
 * so rapid retargets (e.g. tab switches) interrupt mid-spring.
 */
export function animateChrome(
  el: Element,
  keyframes: ChromeKeyframes,
  options?: Parameters<typeof animate>[2],
): AnimationPlaybackControls {
  const prev = runs.get(el)
  prev?.stop()

  const transition = prefersReducedMotion()
    ? { ...chromeReduced, ...options }
    : { ...chromeSpring, ...options }

  const controls = animate(el, keyframes, transition)
  runs.set(el, controls)
  return controls
}

/** Instantly apply chrome geometry (first paint / PRM snap). */
export function snapChrome(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
) {
  const prev = runs.get(el)
  prev?.stop()
  runs.delete(el)
  Object.assign(el.style, styles)
}
