import { animate, scroll, stagger } from 'motion'
import type {
  AnimationPlaybackControls,
  DOMKeyframesDefinition,
} from 'motion'
import { prefersReducedMotion } from './reduced'

export const settleSpring = {
  type: 'spring' as const,
  bounce: 0,
  duration: 0.4,
} as const

const STAGGER_CAP = 8
const SLIDE_PX = 28

type SettleKeyframes = DOMKeyframesDefinition
type SlideFrom = 'left' | 'right' | 'up'

const fadeIn: SettleKeyframes = { opacity: [0, 1] }
const prmOpts = { duration: 0.2, ease: 'easeOut' as const }

export function slideKeyframes(from: SlideFrom = 'up'): SettleKeyframes {
  if (from === 'left') return { opacity: [0, 1], x: [-SLIDE_PX, 0] }
  if (from === 'right') return { opacity: [0, 1], x: [SLIDE_PX, 0] }
  return { opacity: [0, 1], y: [20, 0] }
}

const riseIn = slideKeyframes('up')

function hide(el: Element) {
  if (el instanceof HTMLElement) el.style.opacity = '0'
}

function springOpts(duration?: number) {
  return duration != null ? { ...settleSpring, duration } : { ...settleSpring }
}

export function settleNow(
  els: Element | Element[],
  keyframes: SettleKeyframes = riseIn,
  options?: { duration?: number; staggerMs?: number },
): AnimationPlaybackControls | undefined {
  const list = (Array.isArray(els) ? els : [els]).slice(0, STAGGER_CAP)
  if (list.length === 0) return undefined

  const prm = prefersReducedMotion()
  for (const el of list) hide(el)

  return animate(list, prm ? fadeIn : keyframes, {
    ...(prm ? prmOpts : springOpts(options?.duration)),
    delay: stagger((options?.staggerMs ?? 80) / 1000),
  })
}

export function parallaxY(
  el: Element,
  options?: { distance?: number; target?: Element },
): () => void {
  if (prefersReducedMotion()) return () => {}

  const distance = options?.distance ?? 80
  const animation = animate(
    el,
    { y: [-distance / 2, distance / 2] },
    { ease: 'linear' },
  )
  const stopScroll = scroll(animation, {
    target: options?.target ?? el,
    offset: ['start end', 'end start'],
  })
  return () => {
    stopScroll()
    animation.stop()
  }
}
