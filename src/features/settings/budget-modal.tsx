import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldDescription,
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
import {
  clearMonthBudget,
  getOverview,
  setMonthBudget,
  updateSettings,
} from '#/data/repository'
import {
  CURRENCIES,
  currencyLabel,
  formatYearMonth,
  isCurrencyCode,
  money,
  monthBudgetMatchesDefault,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'

export function BudgetModal({
  open,
  onOpenChange,
  yearMonth,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  yearMonth: string
}) {
  const queryClient = useQueryClient()
  const [currencyDraft, setCurrencyDraft] = useState('USD')
  const [defaultBudgetDraft, setDefaultBudgetDraft] = useState('')
  const [monthBudgetDraft, setMonthBudgetDraft] = useState('')

  const overviewQuery = useQuery({
    queryKey: queryKeys.overviewMonth(yearMonth),
    queryFn: async () => {
      const overview = await getOverview(yearMonth)
      queryClient.setQueryData(queryKeys.settings, overview.settings)
      return overview
    },
    enabled: open,
  })

  const monthBudget = overviewQuery.data?.monthBudget
  const monthLabel = formatYearMonth(yearMonth)

  useEffect(() => {
    if (!open || !monthBudget || !overviewQuery.data) return
    setDefaultBudgetDraft(String(monthBudget.defaultBudget))
    setMonthBudgetDraft(String(monthBudget.budget))
    setCurrencyDraft(
      overviewQuery.data.settings.currency.trim().toUpperCase() || 'USD',
    )
  }, [open, monthBudget, overviewQuery.data])

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const defaultBudget = Number(defaultBudgetDraft)
      const monthValue = Number(monthBudgetDraft)
      if (!Number.isFinite(defaultBudget) || defaultBudget < 0) {
        throw new Error('Enter a valid default budget (0 or more)')
      }
      if (!Number.isFinite(monthValue) || monthValue < 0) {
        throw new Error('Enter a valid budget for this month (0 or more)')
      }
      const currency = currencyDraft.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error('Choose a valid currency')
      }
      try {
        money(0, currency)
      } catch {
        throw new Error('Choose a valid currency')
      }

      const targetYearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!targetYearMonth)
        throw new Error('Could not resolve the current month')

      await updateSettings({ budget: defaultBudget, currency })
      if (monthBudgetMatchesDefault(monthValue, defaultBudget)) {
        await clearMonthBudget(targetYearMonth)
      } else {
        await setMonthBudget(targetYearMonth, monthValue)
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['settings'])
      onOpenChange(false)
    },
  })

  const revertMonthMutation = useMutation({
    mutationFn: async () => {
      const targetYearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!targetYearMonth)
        throw new Error('Could not resolve the current month')
      await clearMonthBudget(targetYearMonth)
    },
    onSuccess: async () => {
      const defaultBudget =
        overviewQuery.data?.monthBudget.defaultBudget ??
        Number(defaultBudgetDraft)
      setMonthBudgetDraft(String(defaultBudget))
      await invalidateAfter(queryClient, ['settings'])
    },
  })

  const error =
    settingsMutation.error?.message ??
    revertMonthMutation.error?.message ??
    null

  return (
    <ComposerFormModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          settingsMutation.reset()
          revertMonthMutation.reset()
        }
      }}
      title="Budget & currency"
      description={`Set a default monthly budget, or a one-off amount for ${monthLabel}. Percentages use this month’s budget.`}
      pending={settingsMutation.isPending}
      submitDisabled={overviewQuery.isPending}
      error={error}
      onSubmit={() => settingsMutation.mutate()}
      contentClassName="sm:max-w-lg"
    >
      <FieldGroup className="gap-4 py-2">
        <Field>
          <FieldLabel htmlFor="display-currency">Currency</FieldLabel>
          <Select value={currencyDraft} onValueChange={setCurrencyDraft}>
            <SelectTrigger id="display-currency" className="w-full">
              <SelectValue placeholder="Choose currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(isCurrencyCode(currencyDraft)
                  ? CURRENCIES
                  : [currencyDraft, ...CURRENCIES]
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
          <FieldLabel htmlFor="default-budget">
            Default monthly budget ({currencyLabel(currencyDraft)})
          </FieldLabel>
          <Input
            id="default-budget"
            name="defaultBudget"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoComplete="off"
            value={defaultBudgetDraft}
            onChange={(event) => setDefaultBudgetDraft(event.target.value)}
          />
          <FieldDescription>
            Used every month unless you set a custom amount below.
          </FieldDescription>
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="month-budget">
              This month’s budget · {monthLabel}
            </FieldLabel>
            {monthBudget?.isCustom ||
            monthBudgetDraft !== defaultBudgetDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setMonthBudgetDraft(defaultBudgetDraft)
                  if (monthBudget?.isCustom) revertMonthMutation.mutate()
                }}
                disabled={
                  settingsMutation.isPending || revertMonthMutation.isPending
                }
              >
                <RotateCcw data-icon="inline-start" />
                Use default
              </Button>
            ) : null}
          </div>
          <Input
            id="month-budget"
            name="monthBudget"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoComplete="off"
            value={monthBudgetDraft}
            onChange={(event) => setMonthBudgetDraft(event.target.value)}
          />
          <FieldDescription>
            {monthBudget?.isCustom
              ? `Custom for ${monthLabel}.`
              : 'Matches your default until you change it.'}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </ComposerFormModal>
  )
}
