import { useEffect, useMemo, useState } from 'react'
import type { LedgerFilterChip } from '#/features/ledger/ledger-filters'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { currentYearMonth } from '#/lib/finance'

function typeFromSearch(type: string | undefined): 'all' | TransactionType {
  if (type === 'expense' || type === 'income' || type === 'transfer')
    return type
  return 'all'
}

interface UseLedgerFiltersArgs {
  search: {
    month?: string
    category?: string
    method?: string
    type?: TransactionType
    q?: string
  }
  categories: { id: string; name: string }[]
  methods: { id: string; name: string }[]
  rows: LedgerTransaction[]
  onNavigate: (opts: { search: any; replace?: boolean }) => void
}

export function useLedgerFilters({
  search,
  categories,
  methods,
  rows,
  onNavigate,
}: UseLedgerFiltersArgs) {
  const { category: categoryFilter, method: methodFilter, q: qParam } = search
  const [filter, setFilterState] = useState<'all' | TransactionType>(() =>
    typeFromSearch(search.type),
  )
  const [query, setQuery] = useState(qParam ?? '')

  useEffect(() => {
    setFilterState(typeFromSearch(search.type))
  }, [search.type])

  function setFilter(next: 'all' | TransactionType) {
    setFilterState(next)
    onNavigate({
      search: (prev: any) => {
        const nextSearch = { ...prev }
        if (next === 'all') delete nextSearch.type
        else nextSearch.type = next
        return nextSearch
      },
      replace: true,
    })
  }

  const categoryFilterName = useMemo(() => {
    if (!categoryFilter) return null
    return categories.find((c) => c.id === categoryFilter)?.name ?? null
  }, [categories, categoryFilter])

  const methodFilterName = useMemo(() => {
    if (!methodFilter) return null
    return methods.find((m) => m.id === methodFilter)?.name ?? null
  }, [methodFilter, methods])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc: { income: number; expenses: number }, row: LedgerTransaction) => {
        if (row.type === 'income') acc.income += row.amount
        else if (row.type === 'expense') acc.expenses += row.amount
        return acc
      },
      { income: 0, expenses: 0 },
    )
  }, [rows])

  const narrowingFilters = Boolean(
    categoryFilter || methodFilter || filter !== 'all' || query.trim(),
  )

  function stripComposerSearch() {
    onNavigate({
      search: (prev: any) => {
        const { new: _new, edit: _edit, ...rest } = prev
        return rest
      },
      replace: true,
    })
  }

  function clearFilters() {
    setFilterState('all')
    setQuery('')
    onNavigate({
      search: { month: currentYearMonth() },
      replace: true,
    })
  }

  function clearChip(key: string) {
    if (key === 'type') {
      setFilter('all')
      return
    }
    if (key === 'q') {
      setQuery('')
      return
    }
    if (key === 'all-months') {
      onNavigate({
        search: (prev: any) => {
          const next = { ...prev }
          delete next.month
          return next
        },
        replace: true,
      })
      return
    }
    if (key === 'category') {
      onNavigate({
        search: (prev: any) => {
          const next = { ...prev }
          delete next.category
          return next
        },
        replace: true,
      })
      return
    }
    if (key === 'method') {
      onNavigate({
        search: (prev: any) => {
          const next = { ...prev }
          delete next.method
          return next
        },
        replace: true,
      })
    }
  }

  const filterChips = useMemo(() => {
    const chips: LedgerFilterChip[] = []
    if (search.month === 'all') {
      chips.push({ key: 'all-months', label: 'All months' })
    }
    if (categoryFilterName) {
      chips.push({ key: 'category', label: categoryFilterName })
    }
    if (methodFilterName) {
      chips.push({ key: 'method', label: methodFilterName })
    }
    if (filter !== 'all') {
      chips.push({ key: 'type', label: filter, outline: true })
    }
    if (query.trim()) {
      chips.push({ key: 'q', label: `“${query.trim()}”`, outline: true })
    }
    return chips
  }, [search.month, categoryFilterName, methodFilterName, filter, query])

  return {
    filter,
    setFilter,
    query,
    setQuery,
    categoryFilterName,
    methodFilterName,
    totals,
    narrowingFilters,
    filterChips,
    stripComposerSearch,
    clearFilters,
    clearChip,
  }
}
