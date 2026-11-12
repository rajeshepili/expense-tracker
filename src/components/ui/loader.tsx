import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { cn } from 'cn'
import { APP_NAME } from '#/lib/brand'

export type FirstLoadPhase = 'enter' | 'loop' | 'settle' | 'collapse' | 'exit'

export const FIRST_LOAD = {
  /** Materialize in — rare gate, slightly longer than UI chrome. */
  enterMs: 420,
  /** Soft shimmer sweep — unhurried so the sheen is readable. */
  cycleMs: 3400,
  /** Beat after min cycles before hold (shimmer keeps running). */
  settleMs: 320,
  /** Extra time on “Ready” with shimmer still moving. */
  holdMs: 520,
  /**
   * Word collapses to a point (center, slight upward pull + blur) — the mark
   * dissolves; the sheet itself stays a full plane until `exitMs`.
   */
  collapseMs: 340,
  /**
   * Physical sheet lift — long enough to read the page reveal underneath.
   * Transform-led; opacity only drops after most of the travel.
   */
  exitMs: 720,
  /** At least two full shimmer loops before leaving, even if boot is fast. */
  minCycles: 2,
  /** PRM: brief hold, then opacity cross-fade only (no collapse/slide). */
  reducedHoldMs: 480,
} as const

export type WordmarkShimmerLoaderProps = React.ComponentProps<'p'> & {
  cycleMs?: number
  label?: string
  phase?: FirstLoadPhase
  onEnterComplete?: () => void
  onCycle?: () => void
  onSettleComplete?: () => void
}

/**
 * First-load wordmark — materialize → shimmer loop → settle.
 * AppGate cold start only (not tab nav or in-page fetches).
 */
function WordmarkShimmerLoader({
  className,
  cycleMs = FIRST_LOAD.cycleMs,
  label = APP_NAME,
  phase = 'loop',
  onEnterComplete,
  onCycle,
  onSettleComplete,
  style,
  ...props
}: WordmarkShimmerLoaderProps) {
  // Settle keeps the loop sheen; collapse dissolves the word; exit rides the sheet.
  const visualPhase =
    phase === 'settle' ? 'loop' : phase === 'collapse' ? 'collapse' : phase

  const onAnimEnd = (e: React.AnimationEvent<HTMLParagraphElement>) => {
    if (e.target !== e.currentTarget) return
    if (phase === 'enter' && e.animationName.includes('wordmark-enter')) {
      onEnterComplete?.()
    }
  }

  const onAnimIteration = (e: React.AnimationEvent<HTMLParagraphElement>) => {
    if (e.target !== e.currentTarget) return
    // Count only while the controller is still in loop (not settle/exit).
    if (phase !== 'loop') return
    if (!e.animationName.includes('wordmark-shimmer')) return
    onCycle?.()
  }

  return (
    <p
      role="status"
      aria-label={`Preparing ${label}`}
      data-phase={visualPhase}
      className={cn(
        'brand-wordmark wordmark-shimmer font-semibold',
        className,
      )}
      style={
        {
          ...style,
          '--wordmark-cycle': `${cycleMs}ms`,
          '--wordmark-enter': `${FIRST_LOAD.enterMs}ms`,
        } as React.CSSProperties
      }
      onAnimationEnd={onAnimEnd}
      onAnimationIteration={onAnimIteration}
      {...props}
    >
      {label}
    </p>
  )
}

export type FirstLoadScreenProps = {
  phase: FirstLoadPhase
  cycleMs?: number
  caption?: string
  subcaption?: string
  markClassName?: string
  /** fullscreen = AppGate; embedded = playground frame */
  variant?: 'fullscreen' | 'embedded'
  /** Fixed overlay while app content fades in underneath. */
  overlay?: boolean
  className?: string
  onEnterComplete?: () => void
  onCycle?: () => void
  onSettleComplete?: () => void
  onExitComplete?: () => void
}

function FirstLoadScreenImpl({
  phase,
  cycleMs = FIRST_LOAD.cycleMs,
  caption = 'Loading…',
  subcaption = 'Stored in this browser.',
  markClassName,
  variant = 'fullscreen',
  overlay = false,
  className,
  onEnterComplete,
  onCycle,
  onExitComplete,
}: FirstLoadScreenProps) {
  const onScreenAnimEnd = (e: React.AnimationEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (phase !== 'exit') return
    if (!e.animationName.includes('first-load-exit')) return
    onExitComplete?.()
  }

  const screenStyle = {
    '--wordmark-cycle': `${cycleMs}ms`,
    '--wordmark-collapse': `${FIRST_LOAD.collapseMs}ms`,
    '--first-load-exit': `${FIRST_LOAD.exitMs}ms`,
  } as React.CSSProperties

  const body = (
    <div className="first-load-copy">
      <div className="first-load-stage" aria-hidden={phase === 'exit'}>
        <span className="first-load-material" data-phase={phase} />
        <WordmarkShimmerLoader
          phase={phase}
          cycleMs={cycleMs}
          className={cn('first-load-mark relative z-10', markClassName)}
          onEnterComplete={onEnterComplete}
          onCycle={onCycle}
        />
      </div>
      <p key={caption} className="first-load-caption" data-phase={phase}>
        {caption}
      </p>
      <p className="first-load-subcaption" data-phase={phase}>
        {subcaption}
      </p>
    </div>
  )

  if (variant === 'embedded') {
    return (
      <div
        className={cn('first-load-screen first-load-embedded', className)}
        data-phase={phase}
        onAnimationEnd={onScreenAnimEnd}
        style={screenStyle}
      >
        {body}
      </div>
    )
  }

  const shellClass = cn(
    'first-load-screen flex h-dvh min-h-0 flex-col overflow-hidden bg-background',
    overlay && 'first-load-overlay',
    className,
  )

  const shellInner = (
    <>
      <div
        className="z-10 hidden h-12 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md md:block"
        aria-hidden
      />
      <div
        className="z-10 h-12 shrink-0 border-b border-border/80 bg-background/80 pt-[var(--safe-top)] backdrop-blur-md md:hidden"
        aria-hidden
      />
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center p-6">
        {body}
      </div>
    </>
  )

  // Overlay must not reuse id="main" — app content already owns it.
  if (overlay) {
    return (
      <div
        className={shellClass}
        data-phase={phase}
        aria-hidden
        onAnimationEnd={onScreenAnimEnd}
        style={screenStyle}
      >
        {shellInner}
      </div>
    )
  }

  return (
    <main
      id="main"
      className={shellClass}
      data-phase={phase}
      aria-busy={phase !== 'exit'}
      aria-live="polite"
      aria-label={`Preparing ${APP_NAME}`}
      onAnimationEnd={onScreenAnimEnd}
      style={screenStyle}
    >
      {shellInner}
    </main>
  )
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  )
}

export type FirstLoadControllerOptions = {
  /** True when bootstrap finished (ready or onboarding). */
  bootReady: boolean
  minCycles?: number
  cycleMs?: number
}

/**
 * Drives enter → loop (min cycles) → settle → exit.
 * Exit waits for bootReady AND min dwell (cycles or time); never cuts mid-shimmer.
 *
 * Animation events align to the sheen when they fire, but timers are the source of
 * truth — Chromium can paint an infinite background-position loop without delivering
 * animationiteration, which previously left the gate up after boot forever.
 */
export function useFirstLoadController({
  bootReady,
  minCycles = FIRST_LOAD.minCycles,
  cycleMs = FIRST_LOAD.cycleMs,
}: FirstLoadControllerOptions) {
  const reduceMotion = usePrefersReducedMotion()
  const [phase, setPhase] = useState<FirstLoadPhase>('enter')
  const [cycles, setCycles] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [done, setDone] = useState(false)
  const [session, setSession] = useState(0)

  const bootReadyRef = useRef(bootReady)
  bootReadyRef.current = bootReady
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const cyclesRef = useRef(0)
  const minCyclesRef = useRef(minCycles)
  minCyclesRef.current = minCycles
  const cycleMsRef = useRef(cycleMs)
  cycleMsRef.current = cycleMs
  const loopStartedAtRef = useRef(0)

  const holdTimerRef = useRef<number | null>(null)

  const beginHandoff = useCallback(() => {
    // Set before React paints children so @starting-style page-enter is skipped.
    document.documentElement.dataset.firstLoad = 'handoff'
    setShowContent(true)
  }, [])

  const beginSettle = useCallback(() => {
    if (phaseRef.current !== 'loop') return
    if (!bootReadyRef.current) return
    beginHandoff()
    setPhase('settle')
  }, [beginHandoff])

  const enterLoop = useCallback(() => {
    if (phaseRef.current !== 'enter') return
    loopStartedAtRef.current = performance.now()
    setPhase('loop')
  }, [])

  const replay = useCallback(() => {
    if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
    delete document.documentElement.dataset.firstLoad
    cyclesRef.current = 0
    loopStartedAtRef.current = 0
    setCycles(0)
    setPhase('enter')
    setShowContent(false)
    setDone(false)
    setSession((s) => s + 1)
  }, [])

  // PRM: no shimmer loops — short hold after boot, then opacity exit.
  useEffect(() => {
    if (!reduceMotion) return
    if (!bootReady) return
    if (done) return
    const t = window.setTimeout(() => {
      beginHandoff()
      setPhase('exit')
    }, FIRST_LOAD.reducedHoldMs)
    return () => window.clearTimeout(t)
  }, [reduceMotion, bootReady, done, session, beginHandoff])

  // Enter: animationend preferred; timer fallback if the event never arrives.
  useEffect(() => {
    if (reduceMotion) return
    if (phase !== 'enter') return
    const t = window.setTimeout(enterLoop, FIRST_LOAD.enterMs + 80)
    return () => window.clearTimeout(t)
  }, [phase, reduceMotion, enterLoop, session])

  const onEnterComplete = useCallback(() => {
    if (reduceMotion) return
    enterLoop()
  }, [reduceMotion, enterLoop])

  const onCycle = useCallback(() => {
    if (phaseRef.current !== 'loop') return
    cyclesRef.current += 1
    const next = cyclesRef.current
    if (bootReadyRef.current && next >= minCyclesRef.current) {
      setCycles(next)
      beginSettle()
      return
    }
    // Defer counter updates — sync setState every loop contended with the sweep.
    startTransition(() => setCycles(next))
  }, [beginSettle])

  // Loop → settle: time + bootReady are authoritative; cycles only align early.
  useEffect(() => {
    if (reduceMotion) return
    if (phase !== 'loop') return
    if (!bootReady) return

    const minMs = minCyclesRef.current * cycleMsRef.current
    const elapsed = performance.now() - loopStartedAtRef.current
    const remain = Math.max(0, minMs - elapsed)

    const tryAdvance = () => {
      if (phaseRef.current !== 'loop') return
      if (!bootReadyRef.current) return
      const waited = performance.now() - loopStartedAtRef.current
      if (
        cyclesRef.current >= minCyclesRef.current ||
        waited >= minCyclesRef.current * cycleMsRef.current
      ) {
        beginSettle()
      }
    }

    const t = window.setTimeout(tryAdvance, remain)
    return () => window.clearTimeout(t)
  }, [phase, bootReady, reduceMotion, beginSettle, session])

  // Settle no longer freezes the mark — shimmer keeps running; then collapse, then lift.
  useEffect(() => {
    if (phase !== 'settle') return
    if (reduceMotion) return
    const t = window.setTimeout(() => {
      if (phaseRef.current !== 'settle') return
      setPhase('collapse')
    }, FIRST_LOAD.settleMs + FIRST_LOAD.holdMs)
    return () => window.clearTimeout(t)
  }, [phase, reduceMotion])

  useEffect(() => {
    if (phase !== 'collapse') return
    if (reduceMotion) return
    // Slight overlap: sheet starts lifting as the word finishes dissolving.
    const t = window.setTimeout(() => {
      if (phaseRef.current !== 'collapse') return
      setPhase('exit')
    }, Math.round(FIRST_LOAD.collapseMs * 0.7))
    return () => window.clearTimeout(t)
  }, [phase, reduceMotion])

  // Exit → done: animationend preferred; timer so a missing event cannot trap the gate.
  useEffect(() => {
    if (phase !== 'exit') return
    if (done) return
    const ms = reduceMotion ? 280 : FIRST_LOAD.exitMs + 120
    const t = window.setTimeout(() => {
      setDone(true)
    }, ms)
    return () => window.clearTimeout(t)
  }, [phase, reduceMotion, done, session])

  const onSettleComplete = useCallback(() => {
    // Kept for API compatibility; exit is timer-driven while shimmer continues.
  }, [])

  const onExitComplete = useCallback(() => {
    setDone(true)
  }, [])

  // Clear handoff suppress after the gate is gone (next frame — no remount).
  useEffect(() => {
    if (!done) return
    const id = window.requestAnimationFrame(() => {
      delete document.documentElement.dataset.firstLoad
    })
    return () => window.cancelAnimationFrame(id)
  }, [done])

  useEffect(() => {
    return () => {
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current)
      delete document.documentElement.dataset.firstLoad
    }
  }, [])

  return {
    phase,
    cycles,
    showContent,
    done,
    session,
    cycleMs,
    reduceMotion,
    onEnterComplete,
    onCycle,
    onSettleComplete,
    onExitComplete,
    replay,
  }
}

/** Memoized so playground cycle counter updates don’t re-render the animating mark. */
const FirstLoadScreen = memo(FirstLoadScreenImpl)

export { WordmarkShimmerLoader, FirstLoadScreen }
