import { LocalDataCallout } from '#/features/shared/local-data'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { CURRENCIES, currencyLabel, isCurrencyCode } from '#/lib/finance'

type MoneyStepProps = {
  headingId: string
  fromMkt: boolean
  currency: string
  budget: string
  restorePending: boolean
  restoreError: string | null
  onCurrencyChange: (value: string) => void
  onBudgetChange: (value: string) => void
  onContinue: () => void
  onBack: () => void
  onRestoreClick: () => void
}

export function MoneyStep({
  headingId,
  fromMkt,
  currency,
  budget,
  restorePending,
  restoreError,
  onCurrencyChange,
  onBudgetChange,
  onContinue,
  onBack,
  onRestoreClick,
}: MoneyStepProps) {
  return (
    <>
      <div className="space-y-2">
        <h1
          id={headingId}
          className="text-pretty text-2xl font-semibold tracking-tight text-foreground"
        >
          Currency & budget
        </h1>
        {fromMkt ? (
          <p className="text-pretty text-sm text-muted-foreground">
            Ledger storage starts on this device — the marketing site kept
            nothing.
          </p>
        ) : (
          <p className="text-pretty text-sm text-muted-foreground">
            Choose how amounts appear, and a default monthly budget you can
            change later.
          </p>
        )}
        {fromMkt ? <LocalDataCallout /> : null}
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="onboarding-currency">Currency</FieldLabel>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger
              id="onboarding-currency"
              className="min-h-11 w-full"
            >
              <SelectValue placeholder="Choose currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(isCurrencyCode(currency)
                  ? CURRENCIES
                  : [currency, ...CURRENCIES]
                ).map((code) => (
                  <SelectItem key={code} value={code}>
                    {currencyLabel(code)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-budget">
            Default monthly budget ({currency})
          </FieldLabel>
          <Input
            id="onboarding-budget"
            name="budget"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoComplete="off"
            className="min-h-11"
            value={budget}
            onChange={(event) => onBudgetChange(event.target.value)}
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
        {!fromMkt ? (
          <Button
            type="button"
            variant="ghost"
            className="pressable min-h-11 w-full"
            onClick={onBack}
          >
            Back
          </Button>
        ) : null}
        <button
          type="button"
          className="pressable text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          disabled={restorePending}
          onClick={onRestoreClick}
        >
          {restorePending ? 'Restoring…' : 'Restore a backup instead'}
        </button>
        {restoreError ? (
          <p className="text-sm text-destructive" role="alert">
            {restoreError}
          </p>
        ) : null}
      </div>
    </>
  )
}
