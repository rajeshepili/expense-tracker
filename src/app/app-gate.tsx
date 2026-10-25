import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
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
  return error instanceof Error ? error.message : 'Failed to open local database'
}

export function AppGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<GateState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { bootstrapApp, getOverview } = await import('#/data/repository')
        const { needsOnboarding } = await bootstrapApp()
        if (cancelled) return

        queryClient.setQueryData(queryKeys.onboarding, needsOnboarding)
        if (!needsOnboarding) {
          void queryClient.query({
            queryKey: queryKeys.overview,
            queryFn: async () => {
              const overview = await getOverview()
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
    })()

    return () => {
      cancelled = true
    }
  }, [queryClient])

  if (state.status === 'loading') {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-6xl items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Opening local database…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-6xl flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Could not open the local database</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Prefer Chrome or Edge in a normal window. Avoid private mode if you
          want data to stick. The server must send COOP/COEP headers — see{' '}
          <code className="text-[0.7rem]">
            docs/opfs-and-cross-origin-isolation.md
          </code>
          .
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (state.status === 'onboarding') {
    return (
      <div className="scroll-panel h-dvh">
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
      </div>
    )
  }

  return children
}
