import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query/keys'
import {
  listRecurring,
  getSettings,
  getMonthBudget,
  listCategories,
  listAccounts,
} from '#/data/repository'
import { sortRecurring } from '#/lib/recurring-form'
import { formatQueryError } from '#/lib/errors'

export function useRecurringList() {
  const recurringQuery = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: listRecurring,
  })

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })

  const monthBudgetQuery = useQuery({
    queryKey: queryKeys.monthBudget,
    queryFn: () => getMonthBudget(),
  })

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
  })

  const methodsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: listAccounts,
  })

  const items = useMemo(
    () => sortRecurring(recurringQuery.data ?? []),
    [recurringQuery.data],
  )

  const monthlyBudget =
    monthBudgetQuery.data?.budget ?? settingsQuery.data?.budget ?? 0
  const currency = settingsQuery.data?.currency ?? 'USD'
  const expenseCategories = (categoriesQuery.data ?? []).filter(
    (c) => c.type === 'expense',
  )
  const incomeCategories = (categoriesQuery.data ?? []).filter(
    (c) => c.type === 'income',
  )
  const accounts = (methodsQuery.data ?? [])
    .filter((account) => !account.closed)
    .map((account) => ({ id: account.id, name: account.name }))

  const isLoading =
    recurringQuery.isPending ||
    settingsQuery.isPending ||
    monthBudgetQuery.isPending
  const isError =
    recurringQuery.isError || settingsQuery.isError || monthBudgetQuery.isError
  const errorMessage = isError
    ? formatQueryError(
        recurringQuery.error ?? settingsQuery.error ?? monthBudgetQuery.error,
      )
    : null

  return {
    items,
    currency,
    monthlyBudget,
    expenseCategories,
    incomeCategories,
    accounts,
    isLoading,
    isError,
    errorMessage,
    retry: () => {
      void recurringQuery.refetch()
      void settingsQuery.refetch()
      void monthBudgetQuery.refetch()
    },
  }
}
