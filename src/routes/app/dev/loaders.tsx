import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/layout/page-header'
import { PageShell } from '#/components/layout/page-shell'
import {
  FIRST_LOAD,
  FirstLoadScreen,
  useFirstLoadController,
} from '#/components/ui/loader'

export const Route = createFileRoute('/dev/loaders')({
  component: DevLoadersGate,
})

function DevLoadersGate() {
  if (!import.meta.env.DEV) return <Navigate to="/" />
  return (
    <PageShell scroll="page">
      <PageHeader
        title="First-load gate"
        description="Dev-only A/B surface for the AppGate cold-start animation."
      />
      <DevGatePreview />
    </PageShell>
  )
}

function DevGatePreview() {
  const [bootDelayMs, setBootDelayMs] = useState(600)
  const [bootReady, setBootReady] = useState(false)
  const [minCycles, setMinCycles] = useState<1 | 2>(FIRST_LOAD.minCycles)
  const [cycleMs, setCycleMs] = useState<number>(FIRST_LOAD.cycleMs)

  const firstLoad = useFirstLoadController({ bootReady, minCycles, cycleMs })

  const replay = () => {
    setBootReady(false)
    firstLoad.replay()
    window.setTimeout(() => setBootReady(true), bootDelayMs)
  }

  const caption = !bootReady ? 'Loading…' : 'Ready'

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="relative min-h-64 overflow-hidden rounded-lg border border-border/70">
        {firstLoad.showContent || firstLoad.done ? (
          <div
            className={
              'flex min-h-64 flex-col items-center justify-center gap-1 bg-background p-6 text-center' +
              (firstLoad.showContent && !firstLoad.done
                ? ' first-load-content absolute inset-0'
                : '')
            }
          >
            <p className="brand-wordmark text-sm font-semibold tracking-tight">
              Pocketbook
            </p>
            <p className="text-xs text-muted-foreground">
              {firstLoad.done ? 'Handoff complete — press Replay' : 'App shell (preview)'}
            </p>
          </div>
        ) : null}
        {!firstLoad.done ? (
          <FirstLoadScreen
            key={firstLoad.session}
            variant="embedded"
            phase={firstLoad.phase}
            cycleMs={cycleMs}
            caption={caption}
            className={
              firstLoad.showContent ? 'absolute inset-0 z-10 min-h-64' : 'min-h-64'
            }
            onEnterComplete={firstLoad.onEnterComplete}
            onCycle={firstLoad.onCycle}
            onSettleComplete={firstLoad.onSettleComplete}
            onExitComplete={firstLoad.onExitComplete}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-28 shrink-0">Cycle</span>
          <input
            type="range"
            min={2000}
            max={5000}
            step={100}
            value={cycleMs}
            onChange={(e) => setCycleMs(Number(e.target.value))}
            className="min-h-6 flex-1"
          />
          <span className="w-16 text-right tabular-nums">{cycleMs}ms</span>
        </label>
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-28 shrink-0">Boot delay</span>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={bootDelayMs}
            onChange={(e) => setBootDelayMs(Number(e.target.value))}
            className="min-h-6 flex-1"
          />
          <span className="w-16 text-right tabular-nums">{bootDelayMs}ms</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={replay}>
          Replay
        </Button>
        <Button
          size="sm"
          variant={bootReady ? 'secondary' : 'outline'}
          onClick={() => setBootReady(true)}
        >
          Force boot ready
        </Button>
        <Button
          size="sm"
          variant={minCycles === 1 ? 'default' : 'outline'}
          onClick={() => setMinCycles(1)}
        >
          Min 1 cycle
        </Button>
        <Button
          size="sm"
          variant={minCycles === 2 ? 'default' : 'outline'}
          onClick={() => setMinCycles(2)}
        >
          Min 2 cycles
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        phase {firstLoad.phase} · cycles {firstLoad.cycles}/{minCycles} · boot{' '}
        {bootReady ? 'ready' : 'pending'} ·{' '}
        {firstLoad.done ? 'done' : firstLoad.showContent ? 'handoff' : 'gate up'}
        {firstLoad.reduceMotion ? ' · reduced motion' : ''}
      </p>
    </section>
  )
}
