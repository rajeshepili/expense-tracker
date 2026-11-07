import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Target } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '#/components/ui/responsive-modal'
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { recordSavingsContribution } from '#/data/repository'
import { money } from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import {
  exceedsRemaining,
  parsePositiveAmount,
  savingsRemaining,
} from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'

export function ContributeProgressDialog({
  goal,
  currency,
  onOpenChange,
}: {
  goal: SavingsGoalRow | null
  currency: string
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const remaining = goal ? savingsRemaining(goal) : 0

  useEffect(() => {
    if (!goal) {
      setAmount('')
      setError(null)
      return
    }
    setAmount(remaining > 0 ? String(remaining) : '')
    setError(null)
  }, [goal, remaining])

  const contributeMutation = useMutation({
    mutationFn: async (value: number) => {
      if (!goal) throw new Error('No goal selected')
      if (exceedsRemaining(value, remaining)) {
        throw new Error('Amount is more than this goal still needs')
      }
      return recordSavingsContribution(goal.id, value)
    },
    onSuccess: async () => {
      onOpenChange(false)
      await invalidateAfter(queryClient, ['savingsGoals'])
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function submit() {
    const value = parsePositiveAmount(amount)
    if (value === null) {
      setError('Enter an amount greater than 0')
      return
    }
    if (exceedsRemaining(value, remaining)) {
      setError('Amount is more than this goal still needs')
      return
    }
    contributeMutation.mutate(value)
  }

  return (
    <ResponsiveModal
      open={Boolean(goal)}
      onOpenChange={(next) => {
        if (!next) {
          contributeMutation.reset()
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <ResponsiveModalContent className="sm:max-w-md" showCloseButton={false}>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Target className="size-4" aria-hidden />
            Add progress
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {goal
              ? `${money(goal.currentAmount, currency)} of ${money(goal.targetAmount, currency)} saved · ${money(remaining, currency)} left.`
              : 'Choose how much to add.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="grid gap-3 py-1">
          <Field>
            <FieldLabel htmlFor="contribute-amount">Amount</FieldLabel>
            <Input
              id="contribute-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              className="min-h-11 md:min-h-9"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setError(null)
              }}
            />
          </Field>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <ResponsiveModalFooter>
          <Button
            type="button"
            variant="outline"
            disabled={contributeMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={contributeMutation.isPending || remaining <= 0}
            onClick={submit}
          >
            {contributeMutation.isPending ? 'Adding…' : 'Add progress'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
