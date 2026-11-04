import { useRef, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FundGoalOffer } from '#/components/fund-goal-dialog'
import type {
  CategoryType,
  LedgerSearch,
  LedgerTransaction,
  TransactionType,
} from '#/lib/types'
import { currentYearMonth } from '#/lib/finance'
import { readTransactionDefaults } from '#/lib/transaction-defaults'
import { useLedgerList } from '#/lib/ledger-list'
import { useLedgerFilters } from '#/lib/ledger-filters'
import {
  useLedgerForm,
  emptyLedgerForm,
  formFromTransaction,
  prepareTransferEdit,
} from '#/lib/ledger-form'
import type { LedgerFormState } from '#/lib/ledger-form'
import { useComposer } from '#/hooks/use-composer'
import { useCreateHotkey } from './use-create-hotkey'
import { motion, resolveMonthDirection } from '#/lib/motion'

type LedgerNavigate = (opts: {
  search: LedgerSearch | ((prev: LedgerSearch) => LedgerSearch)
  replace?: boolean
}) => void

type UseLedgerPageArgs = {
  search: LedgerSearch
  navigate: LedgerNavigate
}

type LedgerPageLoading = { status: 'loading' }
type LedgerPageError = { status: 'error'; message: string; retry: () => void }
type LedgerPageReady = { status: 'ready' } & ReturnType<typeof useLedgerForm> & ReturnType<typeof useLedgerFilters> & {
  descriptionRef: React.RefObject<HTMLInputElement | null>
  editing: LedgerTransaction | null
  form: LedgerFormState
  saveError: string | null
  composerOpen: boolean
  setForm: Dispatch<SetStateAction<LedgerFormState>>
  openEdit: (row: LedgerTransaction) => void
  bindOpenChange: (onClose?: () => void) => (open: boolean) => void
  monthFilter: string | undefined
  categoryFilter: string | undefined
  methodFilter: string | undefined
  viewingMonth: string | null
  categories: { id: string; name: string; type: CategoryType }[]
  methods: { id: string; name: string }[]
  rows: LedgerTransaction[]
  isCurrentMonth: boolean
  listMode: 'empty' | 'filtered' | 'rows'
  fundOffer: FundGoalOffer | null
  setFundOffer: (offer: FundGoalOffer | null) => void
  filteredCategories: { id: string; name: string }[]
  currency: string
  monthFetching: boolean
  goMonth: (month: string) => void
  setSearchFilter: (patch: { category?: string | null; method?: string | null; month?: string }) => void
  filterByMethod: (methodId: string) => void
  setType: (type: TransactionType) => void
  deleting: LedgerTransaction | null
  setDeleting: (tx: LedgerTransaction | null) => void
  askDelete: (transaction: LedgerTransaction) => void
}

export function useLedgerPage({ search, navigate }: UseLedgerPageArgs): LedgerPageLoading | LedgerPageError | LedgerPageReady {
  const descriptionRef = useRef<HTMLInputElement>(null)

  const {
    new: openNew,
    edit: editId,
    month: monthFilter,
    category: categoryFilter,
    method: methodFilter,
    q: qParam,
  } = search

  const [fundOffer, setFundOffer] = useState<FundGoalOffer | null>(null)
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)

  const {
    editing,
    form,
    saveError,
    composerOpen,
    setEditing,
    setForm,
    setSaveError,
    setComposerOpen,
    openEdit: openEditRow,
    reset,
    bindOpenChange,
  } = useComposer<LedgerFormState, LedgerTransaction>({
    emptyForm: emptyLedgerForm,
    formFromRow: formFromTransaction,
  })

  function openEdit(row: LedgerTransaction) {
    if (row.type === 'transfer') {
      void (async () => {
        setSaveError(null)
        try {
          const next = await prepareTransferEdit(row)
          setEditing(row)
          setForm(next)
          setComposerOpen(true)
        } catch (error) {
          setSaveError(
            error instanceof Error
              ? error.message
              : 'Could not open transfer',
          )
          setComposerOpen(true)
        }
      })()
      return
    }
    openEditRow(row)
  }

  const setFormForReturn = setForm as (fn: (current: LedgerFormState) => LedgerFormState) => void

  const filterRef = useRef<'all' | TransactionType>('all')
  const queryRef = useRef('')
  const [debouncedQuery, setDebouncedQuery] = useState(search.q ?? '')
  const debouncedQueryRef = useRef(debouncedQuery)

  const {
    rows,
    categories,
    methods,
    viewingMonth,
    listQueryKey,
    isLoading,
    isFetching,
    isError,
    errorMessage,
    currency,
    retry,
  } = useLedgerList({
    search,
    filter: filterRef.current,
    query: debouncedQueryRef.current,
  })

  const {
    filter,
    setFilter: setFilterFromHook,
    query,
    setQuery: setQueryState,
    totals,
    narrowingFilters,
    filterChips,
    stripComposerSearch,
    clearFilters,
    clearChip,
    categoryFilterName,
    methodFilterName,
  } = useLedgerFilters({
    search,
    categories,
    methods,
    rows,
    onNavigate: navigate,
  })

  filterRef.current = filter
  queryRef.current = query

  const setFilter: Dispatch<SetStateAction<'all' | TransactionType>> = (next) => {
    const value = typeof next === 'function' ? next(filter) : next
    filterRef.current = value
    setFilterFromHook(value)
  }
  const setQuery: Dispatch<SetStateAction<string>> = (next) => {
    setQueryState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      queryRef.current = value
      return value
    })
  }

  const filteredCategories = categories.filter((c) => {
    if (form.type === 'transfer') return false
    return form.type === 'income' ? c.type === 'income' : c.type === 'expense'
  })

  const {
    saveMutation,
    deleteMutation,
    transferMutation,
    openCreateInContext,
    openDuplicate,
    submitForm,
    isSubmitting,
  } = useLedgerForm({
    listQueryKey,
    viewingMonth,
    filteredCategories,
    methods,
    settingsCurrency: currency,
    onFundOffer: setFundOffer,
    editing,
    form,
    setForm,
    setSaveError,
    setComposerOpen,
    reset,
  })

  function askDelete(transaction: LedgerTransaction) {
    setDeleting(transaction)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query)
      debouncedQueryRef.current = query
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const trimmed = query.trim()
    const timer = window.setTimeout(() => {
      if ((qParam ?? '') === trimmed) return
      navigate({
        search: (prev: LedgerSearch) => {
          const { q: _q, ...rest } = prev
          return trimmed ? { ...rest, q: trimmed } : rest
        },
        replace: true,
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, qParam, navigate])

  // Deep-link open (?new / ?edit): wait for the motion gate so the composer
  // doesn't animate during a page slide, then open and strip the URL params.
  useEffect(() => {
    const row = editId ? rows.find((transaction) => transaction.id === editId) : null
    if (!openNew && !row) return
    let cancelled = false
    void (async () => {
      void motion.openOverlay('modal')
      if (cancelled) {
        motion.closeOverlay('modal')
        return
      }
      if (row) openEdit(row)
      else openCreateInContext()
      stripComposerSearch()
    })()
    return () => {
      cancelled = true
    }
  }, [openNew, editId, rows])

  useEffect(() => {
    if (!composerOpen || editing || form.type === 'transfer') return
    if (form.categoryId && filteredCategories.some((c) => c.id === form.categoryId)) return
    const preferred = readTransactionDefaults().categoryIdByType[form.type]
    const next = filteredCategories.find((c) => c.id === preferred) ?? filteredCategories[0]
    if (next) {
      setForm((current) => ({ ...current, categoryId: next.id }))
    }
  }, [composerOpen, editing, form.categoryId, form.type, filteredCategories, setForm])

  useEffect(() => {
    if (!composerOpen) return
    const frame = window.requestAnimationFrame(() => {
      descriptionRef.current?.focus()
      descriptionRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [composerOpen, editing])

  useCreateHotkey(openCreateInContext, composerOpen || !motion.can('hotkey'))

  if (isLoading) {
    return { status: 'loading' as const }
  }

  if (isError) {
    return { status: 'error' as const, message: errorMessage ?? 'Unknown error', retry }
  }

  const isCurrentMonth = viewingMonth !== null && viewingMonth === currentYearMonth()
  const listMode =
    rows.length === 0
      ? narrowingFilters
        ? ('filtered' as const)
        : ('empty' as const)
      : ('rows' as const)

  return {
    status: 'ready' as const,
    descriptionRef,
    filter,
    setFilter,
    query,
    setQuery,
    fundOffer,
    setFundOffer,
    editing,
    form,
    saveError,
    composerOpen,
    setForm,
    openEdit,
    bindOpenChange,
    monthFilter,
    categoryFilter,
    methodFilter,
    viewingMonth,
    categories,
    methods,
    filteredCategories,
    rows,
    totals,
    currency,
    monthFetching: isFetching,
    isCurrentMonth,
    listMode,
    filterChips,
    saveMutation,
    deleteMutation,
    transferMutation,
    openCreateInContext,
    openDuplicate,
    goMonth: (month: string) => {
      if (!motion.can('navigate')) return
      const current = monthFilter ?? currentYearMonth()
      const direction = resolveMonthDirection(current, month)
      void motion.coalesceNavigate(`ledger-month:${month}`, async () => {
        motion.month(
          () =>
            void navigate({
              search: (prev) => ({ ...prev, month }),
              replace: true,
            }),
          direction,
        )
      })
    },
    clearFilters,
    clearChip,
    setSearchFilter: (patch: { category?: string | null; method?: string | null; month?: string }) => {
      navigate({
        search: (prev: LedgerSearch) => {
          const next = { ...prev }
          if ('category' in patch) {
            if (patch.category) next.category = patch.category
            else delete next.category
          }
          if ('method' in patch) {
            if (patch.method) next.method = patch.method
            else delete next.method
          }
          if (patch.month) next.month = patch.month
          return next
        },
        replace: true,
      })
    },
    filterByMethod: (methodId: string) => navigate({ search: (prev: LedgerSearch) => ({ ...prev, method: methodId }), replace: true }),
    setType: (type: TransactionType) => {
      const defaults = readTransactionDefaults()
      setFormForReturn((current) => ({
        ...current,
        type,
        categoryId:
          type === 'transfer'
            ? ''
            : (defaults.categoryIdByType[type] ?? ''),
        fromAccountId: type === 'transfer' ? current.fromAccountId : '',
        toAccountId: type === 'transfer' ? current.toAccountId : '',
        paymentMethodId:
          type === 'transfer' ? '' : current.paymentMethodId,
      }))
    },
    submitForm,
    askDelete,
    deleting,
    setDeleting,
    isSubmitting,
    categoryFilterName,
    methodFilterName,
    narrowingFilters,
    stripComposerSearch,
  }
}