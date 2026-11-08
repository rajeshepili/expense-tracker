import { LocalDataCallout } from '#/features/shared/local-data'
import { Button } from '#/components/ui/button'

type WelcomeStepProps = {
  headingId: string
  restorePending: boolean
  samplePending: boolean
  restoreError: string | null
  sampleError: string | null
  onContinue: () => void
  onExploreSample: () => void
  onRestoreClick: () => void
}

export function WelcomeStep({
  headingId,
  restorePending,
  samplePending,
  restoreError,
  sampleError,
  onContinue,
  onExploreSample,
  onRestoreClick,
}: WelcomeStepProps) {
  const busy = restorePending || samplePending
  return (
    <>
      <div className="space-y-2">
        <h1
          id={headingId}
          className="text-pretty text-2xl font-semibold tracking-tight text-foreground"
        >
          Set up your ledger
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Everything stays in this browser — no account, no cloud. Takes about a
          minute.
        </p>
        <LocalDataCallout />
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <Button
          size="lg"
          className="pressable min-h-11 w-full"
          disabled={busy}
          onClick={onContinue}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="pressable min-h-11 w-full"
          disabled={busy}
          onClick={onExploreSample}
        >
          {samplePending ? 'Loading sample…' : 'Explore with sample data'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="pressable min-h-11 w-full"
          disabled={busy}
          onClick={onRestoreClick}
        >
          {restorePending ? 'Restoring…' : 'Restore a backup'}
        </Button>
        {sampleError ? (
          <p className="text-sm text-destructive" role="alert">
            {sampleError}
          </p>
        ) : null}
        {restoreError ? (
          <p className="text-sm text-destructive" role="alert">
            {restoreError}
          </p>
        ) : null}
      </div>
    </>
  )
}
