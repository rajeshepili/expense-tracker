import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TransactionType } from '#/lib/types'
import { queryKeys } from '#/lib/query/keys'
import { listTransactions, getSettings, listCategories, listPaymentMethods } from '#/data/repository'
import { formatQueryError } from '#/lib/errors'
import { currentYearMonth } from '#/lib/finance'

interface UseLedgerListArgs {
  search: {
    month?: string
    category?: string
    method?: string
    q?: string
  }
  filter: 'all' | TransactionType
  query: string
}

export function useLedgerList({ search, filter, query }: UseLedgerListArgs) {
  const viewingMonth =
    search.month === 'all'
      ? null
      : search.month ?? currentYearMonth()

  const listFilters = useMemo(
    () => ({
      month: search.month === 'all' ? 'all' : (viewingMonth ?? undefined),
      categoryId: search.category,
      paymentMethodId: search.method,
      type: filter === 'all' ? undefined : filter,
      q: query.trim() || undefined,
    }),
    [search.category, filter, search.method, search.month, query, viewingMonth],
  )

  const listQueryKey = queryKeys.transactionsList(listFilters)

  const transactionsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => listTransactions(listFilters),
    placeholderData: (prev) => prev,
  })

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
  })

  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: listPaymentMethods,
  })

  const rows = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const methods = methodsQuery.data ?? []

  const isLoading =
    (transactionsQuery.isPending || settingsQuery.isPending) &&
    !transactionsQuery.data
  const isError = transactionsQuery.isError || settingsQuery.isError
  const errorMessage = isError
    ? formatQueryError(transactionsQuery.error ?? settingsQuery.error)
    : null

  return {
    rows,
    categories,
    methods,
    viewingMonth,
    listQueryKey,
    isLoading,
    isError,
    errorMessage,
    currency: settingsQuery.data?.currency ?? 'USD',
    retry: () => {
      void transactionsQuery.refetch()
      void settingsQuery.refetch()
    },
  }
}