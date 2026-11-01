import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type ExitEntry = { key: string }

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useFlipList<T>(
  containerRef: React.RefObject<HTMLElement | null>,
  items: T[],
  getKey: (item: T, index: number) => string,
) {
  const firstRects = useRef<Map<string, DOMRect>>(new Map())
  const prevKeys = useRef<Set<string>>(new Set())
  const animations = useRef<Animation[]>([])
  const [exiting, setExiting] = useState<ExitEntry[]>([])

  const keys = items.map((item, i) => getKey(item, i))
  const keySet = new Set(keys)
  const keysSig = keys.join('\n')

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const rects = new Map<string, DOMRect>()
    for (const child of Array.from(container.children)) {
      const key = (child as HTMLElement).dataset.flipKey
      if (key) rects.set(key, child.getBoundingClientRect())
    }
    firstRects.current = rects
  })

  useLayoutEffect(() => {
    const prev = prevKeys.current
    prevKeys.current = keySet
    const gone = [...prev].filter((k) => !keySet.has(k))
    if (gone.length > 0) {
      setExiting((cur) => {
        const kept = cur.filter((e) => keySet.has(e.key))
        const added = gone
          .filter((k) => !cur.some((e) => e.key === k))
          .map((k) => ({ key: k }))
        const next = [...kept, ...added]
        return next.length === cur.length && next.every((e, i) => e === cur[i])
          ? cur
          : next
      })
    } else {
      setExiting((cur) =>
        cur.some((e) => !keySet.has(e.key)) ? cur.filter((e) => keySet.has(e.key)) : cur,
      )
    }
  }, [keysSig])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || prefersReducedMotion()) return
    const first = firstRects.current
    for (const anim of animations.current) anim.cancel()
    animations.current = []
    for (const child of Array.from(container.children)) {
      const el = child as HTMLElement
      const key = el.dataset.flipKey
      if (!key || el.hasAttribute('data-flip-exit')) continue
      const prev = first.get(key)
      if (!prev) continue // entering row — keyframe animation handles it
      const next = el.getBoundingClientRect()
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) continue
      const anim = el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        {
          duration: 180,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // --ease-settle
          fill: 'none',
        },
      )
      animations.current.push(anim)
    }
  }, [keysSig, containerRef])

  useEffect(() => {
    if (exiting.length === 0) return
    const id = window.setTimeout(() => setExiting([]), 200)
    return () => window.clearTimeout(id)
  }, [exiting])

  // Entering keys: present now, absent in the previous commit.
  const entering = new Set(keys.filter((k) => !prevKeys.current.has(k)))

  return { exiting, isEntering: (key: string) => entering.has(key) }
}
