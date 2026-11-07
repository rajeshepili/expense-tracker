import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query/keys'
import {
  listSavingsGoals,
  getSettings,
  listCategories,
} from '#/data/repository'
import { formatQueryError } from '#/lib/errors'
import { partitionSavingsGoals, savingsProgressPercent } from '#/lib/savings'

export function useSavingsList() {
  const goalsQuery = useQuery({
    queryKey: queryKeys.savingsGoals,
    queryFn: listSavingsGoals,
  })

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
  })

  const goals = goalsQuery.data ?? []
  const currency = settingsQuery.data?.currency ?? 'USD'
  const categories = categoriesQuery.data ?? []

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  )

  const { open: activeGoals, complete: completedGoals } = useMemo(
    () => partitionSavingsGoals(goals),
    [goals],
  )

  const isLoading = goalsQuery.isPending || settingsQuery.isPending
  const isError = goalsQuery.isError || settingsQuery.isError
  const errorMessage = isError
    ? formatQueryError(goalsQuery.error ?? settingsQuery.error)
    : null

  return {
    goals,
    activeGoals,
    completedGoals,
    currency,
    categories,
    incomeCategories,
    isLoading,
    isError,
    errorMessage,
    retry: () => {
      void goalsQuery.refetch()
      void settingsQuery.refetch()
    },
    savingsProgressPercent,
  }
}
