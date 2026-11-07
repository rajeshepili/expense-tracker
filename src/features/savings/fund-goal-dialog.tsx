import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { listSavingsGoals, recordSavingsContribution } from '#/data/repository'
import { money } from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import {
  defaultContributionAmount,
  exceedsRemaining,
  findRankedGoal,
  parsePositiveAmount,
  rankOpenSavingsGoals,
} from '#/lib/savings'
import type { RankedSavingsGoal } from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'

export type FundGoalOffer = {
  amount: number
  categoryId: string
  currency: string
  description: string
}

type FundVars = {
  goalId: string
  amount: number
  remaining: number
}

function offerKey(offer: FundGoalOffer) {
  return `${offer.amount}\0${offer.categoryId}\0${offer.currency}\0${offer.description}`
}

function amountForRanked(incomeAmount: number, ranked: RankedSavingsGoal) {
  return String(defaultContributionAmount(incomeAmount, ranked.remaining))
}

export function FundGoalDialog({
  offer,
  onOpenChange,
}: {
  offer: FundGoalOffer | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [goalId, setGoalId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const seededOfferKey = useRef<string | null>(null)

  const goalsQuery = useQuery({
    queryKey: queryKeys.savingsGoals,
    queryFn: listSavingsGoals,
    enabled: Boolean(offer),
  })

  const categoryId = offer?.categoryId ?? ''
  const ranked = useMemo(
    () =>
      offer ? rankOpenSavingsGoals(goalsQuery.data ?? [], categoryId) : [],
    [goalsQuery.data, offer, categoryId],
  )

  const selected = useMemo(() => {
    if (ranked.length === 0) return null
    if (goalId) return findRankedGoal(ranked, goalId) ?? ranked[0]
    return ranked[0]
  }, [ranked, goalId])

  const open = Boolean(offer) && ranked.length > 0
  const currency = offer?.currency ?? 'USD'
  const topRanked = ranked[0] ?? null
  const currentOfferKey = offer ? offerKey(offer) : null

  useEffect(() => {
    if (!offer || !currentOfferKey) {
      seededOfferKey.current = null
      setGoalId(null)
      setAmount('')
      setError(null)
      return
    }

    if (!topRanked) {
      if (!goalsQuery.isPending && !goalsQuery.isFetching) {
        onOpenChange(false)
      }
      return
    }

    if (seededOfferKey.current === currentOfferKey) return
    seededOfferKey.current = currentOfferKey
    setGoalId(topRanked.goal.id)
    setAmount(amountForRanked(offer.amount, topRanked))
    setError(null)
  }, [
    offer,
    currentOfferKey,
    topRanked,
    goalsQuery.isPending,
    goalsQuery.isFetching,
    onOpenChange,
  ])

  const fundMutation = useMutation({
    mutationFn: async ({ goalId: id, amount: value, remaining }: FundVars) => {
      if (exceedsRemaining(value, remaining)) {
        throw new Error('Amount is more than this goal still needs')
      }
      return recordSavingsContribution(id, value)
    },
    onSuccess: async (result, vars) => {
      queryClient.setQueryData<SavingsGoalRow[]>(
        queryKeys.savingsGoals,
        (current) =>
          current?.map((goal) =>
            goal.id === vars.goalId
              ? { ...goal, currentAmount: result.currentAmount }
              : goal,
          ),
      )
      onOpenChange(false)
      await invalidateAfter(queryClient, ['savingsGoals'])
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function selectGoal(nextId: string) {
    setGoalId(nextId)
    setError(null)
    if (!offer) return
    const item = findRankedGoal(ranked, nextId)
    if (item) setAmount(amountForRanked(offer.amount, item))
  }

  function submit() {
    if (!selected) {
      setError('Choose a savings goal')
      return
    }
    const value = parsePositiveAmount(amount)
    if (value === null) {
      setError('Enter an amount greater than 0')
      return
    }
    if (exceedsRemaining(value, selected.remaining)) {
      setError('Amount is more than this goal still needs')
      return
    }
    fundMutation.mutate({
      goalId: selected.goal.id,
      amount: value,
      remaining: selected.remaining,
    })
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          fundMutation.reset()
          setError(null)
          seededOfferKey.current = null
        }
        onOpenChange(next)
      }}
    >
      <ResponsiveModalContent className="sm:max-w-md" showCloseButton={false}>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Target className="size-4" aria-hidden />
            Add income to a savings goal?
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {offer
              ? `You just recorded ${money(offer.amount, offer.currency)}${
                  offer.description ? ` for “${offer.description}”` : ''
                }. Put some of it toward a goal.`
              : 'Put some of this income toward a goal.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="grid gap-3 py-1">
          <Field>
            <FieldLabel htmlFor="fund-goal">Goal</FieldLabel>
            <Select value={selected?.goal.id ?? ''} onValueChange={selectGoal}>
              <SelectTrigger
                id="fund-goal"
                className="min-h-11 w-full md:min-h-9"
              >
                <SelectValue placeholder="Choose goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ranked.map(({ goal, remaining, categoryMatch }) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                      {categoryMatch ? ' · matching category' : ''} ·{' '}
                      {money(remaining, currency)} left
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="fund-amount">Amount</FieldLabel>
            <Input
              id="fund-amount"
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
          {selected ? (
            <p className="text-xs text-muted-foreground">
              {money(selected.goal.currentAmount, currency)} of{' '}
              {money(selected.goal.targetAmount, currency)} saved
              {selected.goal.category ? ` · ${selected.goal.category}` : ''}.
            </p>
          ) : null}
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
            disabled={fundMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Skip
          </Button>
          <Button
            type="button"
            disabled={fundMutation.isPending || !selected}
            onClick={submit}
          >
            {fundMutation.isPending ? 'Adding…' : 'Add to goal'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
