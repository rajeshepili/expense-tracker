import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { APP_NAME } from '#/lib/brand'
import { checkModeConsistency, redirectForCurrentRoute } from '#/lib/site-mode'
import { queryKeys } from '#/lib/query/keys'

const OnboardingScreen = lazy(() =>
  import('#/app/onboarding').then((m) => ({ default: m.OnboardingScreen })),
)

type GateState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'mode-mismatch'; message: string }
  | { status: 'onboarding' }
  | { status: 'ready' }

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong while starting up.'
}

export function AppGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<GateState>({ status: 'loading' })

  // Client redirect fallback (previews / portless).
  useEffect(() => {
    const consistency = checkModeConsistency(window.location.hostname)
    if (!consistency.ok) {
      console.error(consistency.message)
      setState({ status: 'mode-mismatch', message: consistency.message })
      return
    }

    const redirect = redirectForCurrentRoute(window.location.pathname, {
      hostname: window.location.hostname,
    })
    if (!redirect) return
    // 150ms opacity cross-fade before the cross-host handoff (PRM: none).
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) {
      document.documentElement.style.transition = 'opacity 150ms ease-out'
      document.documentElement.style.opacity = '0'
      const t = window.setTimeout(() => window.location.assign(redirect), 150)
      return () => window.clearTimeout(t)
    }
    window.location.assign(redirect)
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // persist() often denied pre-install; non-fatal.
        try {
          if (navigator.storage?.persist) {
            const already = (await navigator.storage.persisted?.()) ?? false
            if (!already) await navigator.storage.persist()
          }
        } catch {
          // non-fatal
        }
        const { bootstrapApp, getOverview, repairOrphanTransfers } =
          await import('#/data/repository')
        const { needsOnboarding } = await bootstrapApp()
        if (cancelled) return

        // After migrate/bootstrap: drop broken transfer legs left by older builds.
        await repairOrphanTransfers()
        if (cancelled) return

        queryClient.setQueryData(queryKeys.onboarding, needsOnboarding)
        if (!needsOnboarding) {
          const { currentYearMonth } = await import('#/lib/finance')
          const yearMonth = currentYearMonth()
          void queryClient.query({
            queryKey: queryKeys.overviewMonth(yearMonth),
            queryFn: async () => {
              const overview = await getOverview(yearMonth)
              queryClient.setQueryData(queryKeys.settings, overview.settings)
              return overview
            },
          })
        }
        setState(
          needsOnboarding ? { status: 'onboarding' } : { status: 'ready' },
        )
      } catch (error: unknown) {
        if (!cancelled) {
          setState({ status: 'error', message: messageOf(error) })
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [queryClient])

  useEffect(() => {
    if (state.status !== 'ready') return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      import('#/lib/notifications').then((m) => {
        void m.scheduleBillReminders().catch(() => {})
      })
    }
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.status])

  if (state.status === 'loading') {
    return (
      <main
        id="main"
        className="flex h-dvh min-h-0 flex-col overflow-hidden"
        aria-busy="true"
        aria-live="polite"
        aria-label={`Preparing ${APP_NAME}`}
      >
        <div
          className="z-10 hidden h-12 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md md:block"
          aria-hidden
        />
        <div
          className="z-10 h-12 shrink-0 border-b border-border/80 bg-background/80 pt-[var(--safe-top)] backdrop-blur-md md:hidden"
          aria-hidden
        />
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="brand-wordmark text-base font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </p>
          <Spinner className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading…
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/80">
            Stored in this browser.
          </p>
        </div>
      </main>
    )
  }

  if (state.status === 'mode-mismatch') {
    return (
      <main
        id="main"
        className="mx-auto flex h-dvh w-full max-w-6xl flex-col items-center justify-center gap-3 p-6 text-center"
        role="alert"
        data-testid="mode-mismatch"
      >
        <p className="brand-wordmark text-base font-semibold tracking-tight">
          {APP_NAME}
        </p>
        <p className="text-sm font-medium">Wrong host for this build</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {state.message}
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          Check Vercel project env: marketing host needs{' '}
          <code className="rounded bg-muted px-1">
            VITE_SITE_MODE=marketing
          </code>
          , app host needs{' '}
          <code className="rounded bg-muted px-1">VITE_SITE_MODE=app</code>.
        </p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main
        id="main"
        className="mx-auto flex h-dvh w-full max-w-6xl flex-col items-center justify-center gap-3 p-6 text-center"
        role="alert"
      >
        <p className="brand-wordmark text-base font-semibold tracking-tight">
          {APP_NAME}
        </p>
        <p className="text-sm font-medium">Couldn’t get started</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          This needs Chrome or Edge in a normal (non-private) window — the
          ledger is stored in this browser&rsquo;s private file system (OPFS),
          which private mode and some browsers don&rsquo;t provide.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    )
  }

  if (state.status === 'onboarding') {
    return (
      <main id="main" className="scroll-panel h-dvh">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          }
        >
          <OnboardingScreen
            onComplete={() => {
              queryClient.setQueryData(queryKeys.onboarding, false)
              void (async () => {
                try {
                  const { getOverview } = await import('#/data/repository')
                  const { currentYearMonth } = await import('#/lib/finance')
                  const yearMonth = currentYearMonth()
                  const overview = await getOverview(yearMonth)
                  queryClient.setQueryData(
                    queryKeys.overviewMonth(yearMonth),
                    overview,
                  )
                  queryClient.setQueryData(
                    queryKeys.settings,
                    overview.settings,
                  )
                } catch {
                }
              })()
              setState({ status: 'ready' })
            }}
          />
        </Suspense>
      </main>
    )
  }

  return children
}
