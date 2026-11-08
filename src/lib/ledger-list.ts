import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TransactionType } from '#/lib/types'
import { LEDGER_PAGE_SIZE } from '#/lib/app-config'
import { queryKeys } from '#/lib/query/keys'
import {
  listTransactions,
  summarizeTransactions,
  getSettings,
  listCategories,
  listAccounts,
} from '#/data/repository'
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
  // `all` is no longer a valid ledger scope — treat as current month.
  const viewingMonth =
    !search.month || search.month === 'all'
      ? currentYearMonth()
      : search.month

  const [pageLimit, setPageLimit] = useState(LEDGER_PAGE_SIZE)

  const filterKey = useMemo(
    () =>
      [
        viewingMonth,
        search.category,
        search.method,
        filter,
        query.trim(),
      ].join('|'),
    [viewingMonth, search.category, search.method, filter, query],
  )

  useEffect(() => {
    setPageLimit(LEDGER_PAGE_SIZE)
  }, [filterKey])

  const listFilters = useMemo(
    () => ({
      month: viewingMonth,
      categoryId: search.category,
      paymentMethodId: search.method,
      type: filter === 'all' ? undefined : filter,
      q: query.trim() || undefined,
      limit: pageLimit,
    }),
    [
      search.category,
      filter,
      search.method,
      query,
      viewingMonth,
      pageLimit,
    ],
  )

  const summaryFilters = useMemo(
    () => ({
      month: viewingMonth,
      categoryId: search.category,
      paymentMethodId: search.method,
      type: filter === 'all' ? undefined : filter,
      q: query.trim() || undefined,
    }),
    [search.category, filter, search.method, query, viewingMonth],
  )

  const listQueryKey = queryKeys.transactionsList(listFilters)

  const transactionsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => listTransactions(listFilters),
    placeholderData: (prev) => prev,
  })

  const totalsQuery = useQuery({
    queryKey: queryKeys.transactionsSummary(summaryFilters),
    queryFn: () => summarizeTransactions(summaryFilters),
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
    queryKey: queryKeys.accounts,
    queryFn: listAccounts,
  })

  const rows = transactionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const methods = (methodsQuery.data ?? [])
    .filter((account) => !account.closed)
    .map((account) => ({ id: account.id, name: account.name }))

  const totals = totalsQuery.data ?? { income: 0, expenses: 0, count: 0 }
  const hasMore = rows.length < totals.count && rows.length >= pageLimit

  const isLoading =
    (transactionsQuery.isPending || settingsQuery.isPending) &&
    !transactionsQuery.data
  const isError = transactionsQuery.isError || settingsQuery.isError
  const errorMessage = isError
    ? formatQueryError(transactionsQuery.error ?? settingsQuery.error)
    : null

  const isFetching =
    transactionsQuery.isFetching && !transactionsQuery.isPending

  return {
    rows,
    categories,
    methods,
    viewingMonth,
    listQueryKey,
    totals,
    hasMore,
    loadMore: () => setPageLimit((n) => n + LEDGER_PAGE_SIZE),
    isLoading,
    isFetching,
    isError,
    errorMessage,
    currency: settingsQuery.data?.currency ?? 'USD',
    retry: () => {
      void transactionsQuery.refetch()
      void settingsQuery.refetch()
      void totalsQuery.refetch()
    },
  }
}
