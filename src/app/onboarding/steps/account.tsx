import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import type { AccountType } from '#/lib/types'
import { cn } from 'cn'

type AccountStepProps = {
  headingId: string
  currency: string
  accountName: string
  accountType: AccountType
  startingBalance: string
  onAccountNameChange: (value: string) => void
  onAccountTypeChange: (value: AccountType) => void
  onStartingBalanceChange: (value: string) => void
  onContinue: () => void
  onBack: () => void
}

export function AccountStep({
  headingId,
  currency,
  accountName,
  accountType,
  startingBalance,
  onAccountNameChange,
  onAccountTypeChange,
  onStartingBalanceChange,
  onContinue,
  onBack,
}: AccountStepProps) {
  return (
    <>
      <div className="space-y-2">
        <h1
          id={headingId}
          className="text-pretty text-2xl font-semibold tracking-tight text-foreground"
        >
          First account
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Name the account you spend from most. You can add more later.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="onboarding-account-name">Name</FieldLabel>
          <Input
            id="onboarding-account-name"
            name="accountName"
            autoComplete="off"
            spellCheck={false}
            placeholder="Checking…"
            className="min-h-11"
            value={accountName}
            onChange={(event) => onAccountNameChange(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>Type</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: 'asset' as const,
                  title: 'Asset',
                  description: 'Cash, checking, debit — money you hold.',
                },
                {
                  id: 'liability' as const,
                  title: 'Liability',
                  description: 'Credit cards and other amounts you owe.',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onAccountTypeChange(option.id)}
                className={cn(
                  'pressable min-h-11 rounded-lg border px-4 py-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  accountType === option.id
                    ? 'border-ring/60 bg-secondary ring-2 ring-ring/30'
                    : 'hover:bg-muted',
                )}
                aria-pressed={accountType === option.id}
              >
                <p className="text-sm font-medium">{option.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-starting-balance">
            Starting balance ({currency})
          </FieldLabel>
          <Input
            id="onboarding-starting-balance"
            name="startingBalance"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoComplete="off"
            className="min-h-11"
            value={startingBalance}
            onChange={(event) => onStartingBalanceChange(event.target.value)}
          />
        </Field>
      </FieldGroup>

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
          variant="ghost"
          className="pressable min-h-11 w-full"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </>
  )
}
