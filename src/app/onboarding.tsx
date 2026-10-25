import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { completeOnboarding } from '#/data/repository'
import { CURRENCIES, currencyLabel, isCurrencyCode, money } from '#/lib/finance'
import { LocalDataCallout } from '#/components/local-data'
import { invalidateAfter } from '#/lib/query/invalidation'
import { cn } from 'cn'

type StartMode = 'empty' | 'sample'

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient()
  const [currency, setCurrency] = useState('USD')
  const [budget, setBudget] = useState('2500')
  const [mode, setMode] = useState<StartMode>('empty')

  const mutation = useMutation({
    mutationFn: async () => {
      const amount = Number(budget)
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Enter a valid monthly budget (0 or more)')
      }
      const code = currency.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(code)) {
        throw new Error('Choose a valid currency')
      }
      try {
        money(0, code)
      } catch {
        throw new Error('Choose a valid currency')
      }
      await completeOnboarding({
        budget: amount,
        currency: code,
        loadSample: mode === 'sample',
      })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'settings',
        'transactions',
        'recurring',
        'categories',
        'paymentMethods',
      ])
      onComplete()
    },
  })

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 p-6 md:p-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Expense Tracker
        </p>
        <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
          Set up your local tracker
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Choose a currency and budget, then how you want to start.
        </p>
      </div>

      <LocalDataCallout />

      <FieldGroup className="gap-5 rounded-xl border bg-card/80 p-5 shadow-sm backdrop-blur-sm md:p-6">
        <Field>
          <FieldLabel htmlFor="onboarding-currency">Currency</FieldLabel>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="onboarding-currency" className="w-full">
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
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </Field>

        <FieldSet className="gap-2">
          <FieldLegend variant="label">Starting data</FieldLegend>
          <div className="grid gap-2">
            {(
              [
                {
                  id: 'empty' as const,
                  title: 'Start empty',
                  description: 'Categories and payment methods only.',
                },
                {
                  id: 'sample' as const,
                  title: 'Load sample data',
                  description: 'Example transactions and bills.',
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  'rounded-lg border px-4 py-3 text-left transition-colors',
                  mode === option.id
                    ? 'border-foreground bg-secondary'
                    : 'hover:bg-muted',
                )}
                aria-pressed={mode === option.id}
              >
                <p className="text-sm font-medium">{option.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </FieldSet>

        {mutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {mutation.error.message}
          </p>
        ) : null}

        <Button
          size="lg"
          className="w-full"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Setting up…' : 'Continue'}
        </Button>
      </FieldGroup>
    </div>
  )
}
