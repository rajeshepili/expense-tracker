import { lazy, Suspense, useEffect, useState  } from 'react'
import type {ReactNode} from 'react';
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { APP_NAME } from '#/lib/brand'
import { queryKeys } from '#/lib/query/keys'

const OnboardingScreen = lazy(() =>
  import('#/app/onboarding').then((m) => ({ default: m.OnboardingScreen })),
)

type GateState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
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

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
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
            Getting your ledger ready…
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/80">
            Stays on this device — nothing is uploaded.
          </p>
        </div>
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
          Try Chrome or Edge in a normal window (not private). Your ledger needs
          a secure, isolated browser tab to keep data on this device.
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
              setState({ status: 'ready' })
            }}
          />
        </Suspense>
      </main>
    )
  }

  return children
}
