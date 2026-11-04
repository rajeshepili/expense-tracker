import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, prefersReducedMotion } from '#/lib/motion'

type ExitEntry = { key: string }

const EXIT_MS = 200
/** Full list replaces (navigate / filter / month) — don't stagger every row. */
const BULK_ENTER_THRESHOLD = 3

export type FlipListOptions = {
  /** WAAPI position FLIP. Off for virtualized mobile (translateY fight). */
  waapi?: boolean
  /** CSS enter attrs. Off for virtualized mobile. */
  enters?: boolean
}

function flipNodes(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-flip-key]'),
  )
}

export function useFlipList<T>(
  containerRef: React.RefObject<HTMLElement | null>,
  items: T[],
  getKey: (item: T, index: number) => string,
  options: FlipListOptions = {},
) {
  const waapi = options.waapi !== false
  const enters = options.enters !== false
  const firstRects = useRef<Map<string, DOMRect>>(new Map())
  const prevKeys = useRef<Set<string>>(new Set())
  const primed = useRef(false)
  const animations = useRef<Animation[]>([])
  const [exiting, setExiting] = useState<ExitEntry[]>([])
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(
    () => new Set(),
  )

  const keys = items.map((item, i) => getKey(item, i))
  const keySet = new Set(keys)
  const keysSig = keys.join('\n')

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !waapi) return
    const rects = new Map<string, DOMRect>()
    for (const child of flipNodes(container)) {
      const key = child.dataset.flipKey
      if (key) rects.set(key, child.getBoundingClientRect())
    }
    firstRects.current = rects
  })

  useLayoutEffect(() => {
    const prev = prevKeys.current

    if (!primed.current) {
      // First committed list — seed keys, no enter cascade (avoids border flicker).
      primed.current = true
      prevKeys.current = keySet
      setEnteringKeys(new Set())
      return
    }

    const added = keys.filter((k) => !prev.has(k))
    const gone = [...prev].filter((k) => !keySet.has(k))
    prevKeys.current = keySet

    const bulkReplace =
      added.length > BULK_ENTER_THRESHOLD ||
      (added.length > 0 && added.length === keys.length && prev.size === 0)

    setEnteringKeys(
      !enters || bulkReplace ? new Set() : new Set(added),
    )

    if (gone.length > 0) {
      setExiting((cur) => {
        const kept = cur.filter((e) => keySet.has(e.key))
        const nextGone = gone
          .filter((k) => !cur.some((e) => e.key === k))
          .map((k) => ({ key: k }))
        const next = [...kept, ...nextGone]
        return next.length === cur.length && next.every((e, i) => e === cur[i])
          ? cur
          : next
      })
    } else {
      setExiting((cur) =>
        cur.some((e) => !keySet.has(e.key))
          ? cur.filter((e) => keySet.has(e.key))
          : cur,
      )
    }
  }, [keysSig, enters])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !waapi || prefersReducedMotion()) return
    if (!motion.can('listFlip')) return
    const first = firstRects.current
    for (const anim of animations.current) anim.cancel()
    animations.current = []
    for (const el of flipNodes(container)) {
      const key = el.dataset.flipKey
      if (!key || el.hasAttribute('data-flip-exit')) continue
      const prev = first.get(key)
      if (!prev) continue
      const next = el.getBoundingClientRect()
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) continue
      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 180,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          fill: 'none',
        },
      )
      animations.current.push(anim)
    }
  }, [keysSig, containerRef, waapi])

  useEffect(() => {
    if (exiting.length === 0) return
    const id = window.setTimeout(() => setExiting([]), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [exiting])

  useEffect(() => {
    if (enteringKeys.size === 0) return
    const id = window.setTimeout(() => setEnteringKeys(new Set()), 280)
    return () => window.clearTimeout(id)
  }, [enteringKeys])

  const exitingKeys = new Set(exiting.map((e) => e.key))

  return {
    exiting,
    isEntering: (key: string) => enteringKeys.has(key),
    isExiting: (key: string) => exitingKeys.has(key),
  }
}
