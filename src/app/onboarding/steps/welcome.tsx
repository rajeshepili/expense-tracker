import { LocalDataCallout } from '#/features/shared/local-data'
import { Button } from '#/components/ui/button'

type WelcomeStepProps = {
  headingId: string
  restorePending: boolean
  restoreError: string | null
  onContinue: () => void
  onRestoreClick: () => void
}

export function WelcomeStep({
  headingId,
  restorePending,
  restoreError,
  onContinue,
  onRestoreClick,
}: WelcomeStepProps) {
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
          onClick={onContinue}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="pressable min-h-11 w-full"
          disabled={restorePending}
          onClick={onRestoreClick}
        >
          {restorePending ? 'Restoring…' : 'Restore a backup'}
        </Button>
        {restoreError ? (
          <p className="text-sm text-destructive" role="alert">
            {restoreError}
          </p>
        ) : null}
      </div>
    </>
  )
}
