import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, prefersReducedMotion } from '#/lib/motion'

type ExitEntry<T> = { key: string; item: T; index: number }

type Track<T> = {
  keysSig: string
  keys: string[]
  items: T[]
}

const EXIT_MS = 200
const FLIP_MS = 180
const FLIP_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
/** Full list replaces (navigate / filter / month) — don't stagger every row. */
const BULK_ENTER_THRESHOLD = 3
/**
 * Short lists: every row move is the whole UI. Skip exit-hold + WAAPI —
 * ghosts collapsing later double-animates and reads as flicker.
 */
const SHORT_LIST = 4

export type FlipListOptions = {
  /** WAAPI position FLIP. Off for virtualized mobile (translateY fight). */
  waapi?: boolean
  /** CSS enter attrs. Off for virtualized mobile. */
  enters?: boolean
  /**
   * Keys that should not exit-animate when they disappear (e.g. optimistic
   * `temp-*` ids that swap to real ids).
   */
  isEphemeralKey?: (key: string) => boolean
}

function flipNodes(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-flip-key]'))
}

function measureFlipRects(container: HTMLElement) {
  const rects = new Map<string, DOMRect>()
  for (const child of flipNodes(container)) {
    const key = child.dataset.flipKey
    if (!key) continue
    // Skip exiting rows — opacity/scale would poison the next First snapshot.
    if (child.hasAttribute('data-flip-exit')) continue
    rects.set(key, child.getBoundingClientRect())
  }
  return rects
}

function buildDisplayItems<T>(
  items: T[],
  keySet: Set<string>,
  exiting: ExitEntry<T>[],
) {
  const pending = exiting
    .filter((e) => !keySet.has(e.key))
    .sort((a, b) => a.index - b.index)
  if (pending.length === 0) return items
  const result = [...items]
  for (const entry of pending) {
    result.splice(Math.min(entry.index, result.length), 0, entry.item)
  }
  return result
}

/** FLIP enter/exit + optional WAAPI. Exit holds apply during render to avoid flicker. */
export function useFlipList<T>(
  containerRef: React.RefObject<HTMLElement | null>,
  items: T[],
  getKey: (item: T, index: number) => string,
  options: FlipListOptions = {},
) {
  const waapi = options.waapi !== false
  const enters = options.enters !== false
  const getKeyRef = useRef(getKey)
  getKeyRef.current = getKey
  const ephemeralRef = useRef(options.isEphemeralKey)
  ephemeralRef.current = options.isEphemeralKey

  const keys = items.map((item, i) => getKey(item, i))
  const keySet = new Set(keys)
  const keysSig = keys.join('\n')

  const [track, setTrack] = useState<Track<T>>(() => ({
    keysSig,
    keys,
    items,
  }))
  const [exiting, setExiting] = useState<ExitEntry<T>[]>([])
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(() => new Set())

  /** Last committed resting rects — become First on the next keys change. */
  const firstRects = useRef<Map<string, DOMRect>>(new Map())
  const animations = useRef<Animation[]>([])

  // Adjust enter/exit while rendering so displayItems includes holds before paint.
  if (keysSig !== track.keysSig) {
    const isEphemeralKey = ephemeralRef.current
    const keyOf = getKeyRef.current
    const prevKeySet = new Set(track.keys)
    const prevItems = track.items
    const prevLen = track.keys.length
    const shortList = prevLen <= SHORT_LIST

    const added = keys.filter((k) => !prevKeySet.has(k))
    const gone = track.keys.filter(
      (k) => !keySet.has(k) && !isEphemeralKey?.(k),
    )

    const bulkReplace =
      added.length > BULK_ENTER_THRESHOLD ||
      (added.length > 0 && added.length === keys.length && prevKeySet.size === 0)

    setTrack({ keysSig, keys, items })
    // Short lists: skip enter stagger too — the whole view is moving.
    setEnteringKeys(
      !enters || bulkReplace || shortList ? new Set() : new Set(added),
    )

    setExiting((cur) => {
      const kept = cur.filter(
        (e) => !keySet.has(e.key) && !isEphemeralKey?.(e.key),
      )
      // Short list: drop holds so rows unmount once (no collapse-later hitch).
      if (shortList || gone.length === 0) {
        return kept.length === cur.length ? cur : kept
      }
      const next = [...kept]
      for (const k of gone) {
        if (next.some((e) => e.key === k)) continue
        const index = prevItems.findIndex((item, i) => keyOf(item, i) === k)
        const item = index >= 0 ? prevItems[index] : undefined
        if (index < 0 || item === undefined) continue
        next.push({ key: k, item, index })
      }
      return next
    })
  }

  const displayItems = buildDisplayItems(items, keySet, exiting)
  const displaySig = displayItems.map((item, i) => getKey(item, i)).join('\n')

  /**
   * Position FLIP against displayItems (includes exit holds). First is from the
   * previous committed display; never overwrite First before playing.
   */
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !waapi) return

    for (const anim of animations.current) anim.cancel()
    animations.current = []

    const first = firstRects.current
    const last = measureFlipRects(container)

    const shortList =
      first.size <= SHORT_LIST || last.size <= SHORT_LIST
    const skipPlay =
      prefersReducedMotion() ||
      !motion.can('listFlip') ||
      first.size === 0 ||
      shortList

    if (!skipPlay) {
      for (const el of flipNodes(container)) {
        const key = el.dataset.flipKey
        if (!key) continue
        // Enter/exit own transform via CSS — don't fight them with WAAPI.
        if (
          el.hasAttribute('data-flip-exit') ||
          el.hasAttribute('data-flip-enter')
        ) {
          continue
        }
        const prev = first.get(key)
        if (!prev) continue
        const next = last.get(key)
        if (!next) continue
        const dx = prev.left - next.left
        const dy = prev.top - next.top
        if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) continue
        const anim = el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0, 0)' },
          ],
          {
            duration: FLIP_MS,
            easing: FLIP_EASE,
            fill: 'none',
          },
        )
        animations.current.push(anim)
      }
    }

    firstRects.current = last
  }, [displaySig, containerRef, waapi])

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

  const exitingKeys = useMemo(
    () => new Set(exiting.map((e) => e.key)),
    [exiting],
  )

  return {
    /** Live rows + held exiting rows (mount these for exit CSS). */
    displayItems,
    isEntering: (key: string) => enteringKeys.has(key),
    isExiting: (key: string) => exitingKeys.has(key),
  }
}
