import { useEffect, useRef, type HTMLAttributes } from 'react'
import { money, percent } from '#/lib/finance'
import { cn } from 'cn'

/** Strong ease-out — punches at the start, settles cleanly. */
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 4)
const COUNT_MS = 750
/** Chip stays readable; matches CSS `delta-pop` duration. */
const DELTA_MS = 2200
const EASING_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)'

/** Survives route unmount so Overview can count from the last seen total. */
const remembered = new Map<string, number>()

export type DeltaGoodWhen = 'up' | 'down'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function formatSignedDelta(delta: number, format: (value: number) => string) {
  const body = format(Math.abs(delta))
  return `${delta > 0 ? '+' : '−'}${body}`
}

function deltaTone(
  delta: number,
  goodWhen: DeltaGoodWhen,
): 'good' | 'bad' {
  const rose = delta > 0
  const isGood = goodWhen === 'up' ? rose : !rose
  return isGood ? 'good' : 'bad'
}

type AnimatedNumberProps = {
  value: number
  format: (value: number) => string
  persistKey?: string
  /** Floating signed delta beside the value (default true). */
  showDelta?: boolean
  /**
   * Which direction is favorable for this metric.
   * Income / budget left → `up`. Expenses / budget used → `down`.
   */
  goodWhen?: DeltaGoodWhen
  className?: string
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

/**
 * Counts between values with a blur settle + signed delta chip.
 * Text updates via rAF; motion via WAAPI/CSS (transform/opacity/filter).
 */
export function AnimatedNumber({
  value,
  format,
  persistKey,
  showDelta = true,
  goodWhen = 'up',
  className,
  ...props
}: AnimatedNumberProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const deltaRef = useRef<HTMLSpanElement>(null)
  const currentRef = useRef(value)
  const framedRef = useRef(false)
  const frameRef = useRef(0)
  const clearDeltaRef = useRef(0)
  const valueAnimRef = useRef<Animation | null>(null)

  useEffect(() => {
    const valueNode = valueRef.current
    const deltaNode = deltaRef.current
    if (!valueNode) return

    const to = value
    const rememberedFrom =
      persistKey !== undefined ? remembered.get(persistKey) : undefined

    let from = currentRef.current
    if (!framedRef.current) {
      framedRef.current = true
      from =
        rememberedFrom !== undefined && rememberedFrom !== to
          ? rememberedFrom
          : to
      currentRef.current = from
      valueNode.textContent = format(from)
      if (from === to) {
        if (persistKey !== undefined) remembered.set(persistKey, to)
        return
      }
    } else if (from === to) {
      valueNode.textContent = format(to)
      if (persistKey !== undefined) remembered.set(persistKey, to)
      return
    }

    const delta = to - from

    if (prefersReducedMotion()) {
      currentRef.current = to
      valueNode.textContent = format(to)
      if (persistKey !== undefined) remembered.set(persistKey, to)
      return
    }

    cancelAnimationFrame(frameRef.current)
    window.clearTimeout(clearDeltaRef.current)
    valueAnimRef.current?.cancel()

    const direction = delta > 0 ? 'up' : 'down'
    valueNode.dataset.phase = direction

    valueAnimRef.current = valueNode.animate(
      [
        {
          transform:
            direction === 'up'
              ? 'translateY(5px) scale(0.97)'
              : 'translateY(-5px) scale(0.97)',
          filter: 'blur(2px)',
          opacity: 0.72,
        },
        {
          transform: 'translateY(0) scale(1.02)',
          filter: 'blur(0.5px)',
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: 'translateY(0) scale(1)',
          filter: 'blur(0px)',
          opacity: 1,
        },
      ],
      { duration: COUNT_MS, easing: EASING_CSS, fill: 'none' },
    )

    if (showDelta && deltaNode && Math.abs(delta) > 1e-9) {
      deltaNode.textContent = formatSignedDelta(delta, format)
      deltaNode.dataset.show = 'true'
      deltaNode.dataset.tone = deltaTone(delta, goodWhen)
      // retrigger CSS animation
      deltaNode.style.animation = 'none'
      void deltaNode.offsetWidth
      deltaNode.style.animation = ''
      clearDeltaRef.current = window.setTimeout(() => {
        delete deltaNode.dataset.show
        delete deltaNode.dataset.tone
        deltaNode.textContent = ''
      }, DELTA_MS)
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS)
      const next = from + delta * EASE_OUT(t)
      currentRef.current = next
      valueNode.textContent = format(next)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        currentRef.current = to
        valueNode.textContent = format(to)
        delete valueNode.dataset.phase
        if (persistKey !== undefined) remembered.set(persistKey, to)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.clearTimeout(clearDeltaRef.current)
      valueAnimRef.current?.cancel()
    }
  }, [value, format, persistKey, showDelta, goodWhen])

  return (
    <span
      ref={rootRef}
      className={cn('animated-number-root', className)}
      {...props}
    >
      <span
        ref={valueRef}
        className="animated-number-value tabular-nums"
        aria-live="polite"
      >
        {format(value)}
      </span>
      {showDelta ? (
        <span
          ref={deltaRef}
          className="animated-number-delta tabular-nums"
          aria-hidden="true"
        />
      ) : null}
    </span>
  )
}

export function AnimatedMoney({
  amount,
  currency,
  persistKey,
  showDelta = true,
  goodWhen = 'up',
  className,
  ...props
}: {
  amount: number
  currency: string
  persistKey?: string
  showDelta?: boolean
  goodWhen?: DeltaGoodWhen
  className?: string
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return (
    <AnimatedNumber
      value={amount}
      format={moneyFormatter(currency)}
      persistKey={persistKey}
      showDelta={showDelta}
      goodWhen={goodWhen}
      className={className}
      {...props}
    />
  )
}

export function AnimatedPercent({
  value,
  persistKey,
  showDelta = true,
  goodWhen = 'up',
  className,
  ...props
}: {
  value: number
  persistKey?: string
  showDelta?: boolean
  goodWhen?: DeltaGoodWhen
  className?: string
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return (
    <AnimatedNumber
      value={value}
      format={formatPercent}
      persistKey={persistKey}
      showDelta={showDelta}
      goodWhen={goodWhen}
      className={className}
      {...props}
    />
  )
}

function formatPercent(value: number) {
  return percent(value)
}

const moneyFormatters = new Map<string, (value: number) => string>()

function moneyFormatter(currency: string) {
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = (value: number) => money(value, currency)
    moneyFormatters.set(currency, formatter)
  }
  return formatter
}
