import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Receipt, Search } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '#/components/ui/responsive-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { AnimatedMoney } from '#/components/animated-number'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileList, MobileListRow } from '#/components/layout/mobile-list'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import {
  createTransaction,
  deleteTransaction,
  getSettings,
  listCategories,
  listPaymentMethods,
  listRecentTransactions,
  updateTransaction,
} from '#/data/repository'
import {
  amountToneClass,
  defaultDateForMonth,
  formatIsoDate,
  formatYearMonth,
  isYearMonth,
  money,
  signedAmountPrefix,
  todayIso,
} from '#/lib/finance'
import { queryKeys } from '#/lib/query/keys'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { cn } from 'cn'
import { useComposer } from '#/hooks/use-composer'
import { useOptimisticMutation } from '#/hooks/use-optimistic-mutation'

type LedgerSearch = {
  new?: boolean
  edit?: string
  month?: string
  category?: string
  method?: string
  q?: string
}

export const Route = createFileRoute('/ledger')({
  validateSearch: (search: Record<string, unknown>): LedgerSearch => {
    const monthRaw = typeof search.month === 'string' ? search.month : undefined
    const month =
      monthRaw === 'all' || (monthRaw && isYearMonth(monthRaw))
        ? monthRaw
        : undefined
    return {
      new: search.new === true || search.new === '1' || search.new === 1,
      edit: typeof search.edit === 'string' ? search.edit : undefined,
      month,
      category:
        typeof search.category === 'string' ? search.category : undefined,
      method: typeof search.method === 'string' ? search.method : undefined,
      q: typeof search.q === 'string' ? search.q : undefined,
    }
  },
  component: LedgerPage,
})

type FormState = {
  description: string
  amount: string
  type: TransactionType
  categoryId: string
  paymentMethodId: string
  date: string
}

type SaveVars = {
  editingId: string | null
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: string
  categoryName: string
  paymentMethodId: string | null
  paymentMethodName: string | null
}

function emptyForm(): FormState {
  const defaults = readTransactionDefaults()
  return {
    description: '',
    amount: '',
    type: defaults.type,
    categoryId: defaults.categoryIdByType[defaults.type] ?? '',
    paymentMethodId: defaults.paymentMethodId,
    date: todayIso(),
  }
}

function formFromTransaction(row: LedgerTransaction): FormState {
  return {
    description: row.description,
    amount: String(row.amount),
    type: row.type,
    categoryId: row.categoryId,
    paymentMethodId: row.paymentMethodId ?? '',
    date: row.date,
  }
}

function LedgerPage() {
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const {
    new: openNew,
    edit: editId,
    month: monthFilter,
    category: categoryFilter,
    method: methodFilter,
    q: qParam,
  } = search
  const descriptionRef = useRef<HTMLInputElement>(null)

  const [filter, setFilter] = useState<'all' | TransactionType>('all')
  const [query, setQuery] = useState(qParam ?? '')
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)
  const {
    editing,
    form,
    saveError,
    composerOpen,
    setForm,
    setSaveError,
    setComposerOpen,
    openCreate,
    openEdit,
    reset,
  } = useComposer<FormState, LedgerTransaction>({
    emptyForm,
    formFromRow: formFromTransaction,
  })

  const urlFiltersActive = Boolean(
    (monthFilter && monthFilter !== 'all') ||
      categoryFilter ||
      methodFilter ||
      qParam,
  )

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => listRecentTransactions(1000),
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

  const categories = categoriesQuery.data ?? []
  const methods = methodsQuery.data ?? []
  const filteredCategories = categories.filter((category) =>
    form.type === 'income'
      ? category.type === 'income'
      : category.type === 'expense',
  )

  const saveMutation = useOptimisticMutation<
    LedgerTransaction[],
    SaveVars,
    { mode: 'edit' | 'create'; id: string }
  >({
    queryClient,
    queryKey: queryKeys.transactions,
    invalidateKeys: ['transactions', 'categories'],
    mutationFn: async (vars) => {
      const payload = {
        description: vars.description,
        amount: vars.amount,
        type: vars.type,
        date: vars.date,
        categoryId: vars.categoryId,
        paymentMethodId: vars.paymentMethodId,
      }
      if (vars.editingId) {
        await updateTransaction(vars.editingId, payload)
        return { mode: 'edit' as const, id: vars.editingId }
      }
      const row = await createTransaction(payload)
      return { mode: 'create' as const, id: row.id }
    },
    onMutate: (vars) => {
      setSaveError(null)

      const nextRow: LedgerTransaction = {
        id: vars.editingId ?? `temp-${crypto.randomUUID()}`,
        description: vars.description,
        amount: vars.amount,
        type: vars.type,
        date: vars.date,
        categoryId: vars.categoryId,
        category: vars.categoryName,
        paymentMethodId: vars.paymentMethodId,
        paymentMethod: vars.paymentMethodName,
        sourceRecurringId: null,
      }

      queryClient.setQueryData<LedgerTransaction[]>(
        queryKeys.transactions,
        (current) => {
          const list = current ?? []
          if (vars.editingId) {
            return list.map((row) =>
              row.id === vars.editingId ? nextRow : row,
            )
          }
          return [nextRow, ...list]
        },
      )

      rememberTransactionDefaults({
        type: vars.type,
        categoryId: vars.categoryId,
        paymentMethodId: vars.paymentMethodId ?? '',
      })

      reset()

      return { tempId: vars.editingId ? null : nextRow.id }
    },
    onSuccess: (result, _vars, context) => {
      if (result.mode === 'create' && context?.tempId) {
        queryClient.setQueryData<LedgerTransaction[]>(
          queryKeys.transactions,
          (current) =>
            current?.map((row) =>
              row.id === context.tempId ? { ...row, id: result.id } : row,
            ),
        )
      }
    },
    onError: (error) => {
      setSaveError(error.message || 'Could not save transaction')
      setComposerOpen(true)
    },
  })

  const deleteMutation = useOptimisticMutation<LedgerTransaction[], string>({
    queryClient,
    queryKey: queryKeys.transactions,
    invalidateKeys: ['transactions', 'categories'],
    mutationFn: async (id) => {
      await deleteTransaction(id)
    },
    onMutate: (id) => {
      queryClient.setQueryData<LedgerTransaction[]>(
        queryKeys.transactions,
        (current) => current?.filter((row) => row.id !== id),
      )
      setDeleting(null)
    },
  })

  const rows = useMemo(() => {
    const all = transactionsQuery.data ?? []
    const normalized = query.trim().toLowerCase()
    return all.filter((transaction: LedgerTransaction) => {
      if (filter !== 'all' && transaction.type !== filter) return false
      if (
        monthFilter &&
        monthFilter !== 'all' &&
        !transaction.date.startsWith(monthFilter)
      ) {
        return false
      }
      if (categoryFilter && transaction.categoryId !== categoryFilter) {
        return false
      }
      if (methodFilter && transaction.paymentMethodId !== methodFilter) {
        return false
      }
      if (!normalized) return true
      return (
        transaction.description.toLowerCase().includes(normalized) ||
        transaction.category.toLowerCase().includes(normalized) ||
        (transaction.paymentMethod ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [
    categoryFilter,
    filter,
    methodFilter,
    monthFilter,
    query,
    transactionsQuery.data,
  ])

  const categoryFilterName = useMemo(() => {
    if (!categoryFilter) return null
    return (
      categories.find((category) => category.id === categoryFilter)?.name ??
      null
    )
  }, [categories, categoryFilter])

  const methodFilterName = useMemo(() => {
    if (!methodFilter) return null
    return methods.find((method) => method.id === methodFilter)?.name ?? null
  }, [methodFilter, methods])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc: { income: number; expenses: number }, row: LedgerTransaction) => {
        if (row.type === 'income') acc.income += row.amount
        else acc.expenses += row.amount
        return acc
      },
      { income: 0, expenses: 0 },
    )
  }, [rows])

  function stripComposerSearch() {
    void navigate({
      search: (prev) => {
        const { new: _new, edit: _edit, ...rest } = prev
        return rest
      },
      replace: true,
    })
  }

  function openCreateInContext() {
    openCreate()
    setForm((current) => ({
      ...current,
      date: defaultDateForMonth(monthFilter),
    }))
  }

  function clearFilters() {
    setFilter('all')
    setQuery('')
    void navigate({ search: {}, replace: true })
  }

  function filterByMethod(methodId: string) {
    void navigate({
      search: (prev) => ({ ...prev, method: methodId }),
      replace: true,
    })
  }

  function setType(type: TransactionType) {
    const defaults = readTransactionDefaults()
    setForm((current) => ({
      ...current,
      type,
      categoryId: defaults.categoryIdByType[type] ?? '',
    }))
  }

  function submitForm() {
    const amount = Number(form.amount)
    if (!form.description.trim() || !Number.isFinite(amount) || amount < 0) {
      setSaveError('Enter a description and a valid amount')
      return
    }
    if (!form.categoryId) {
      setSaveError('Choose a category')
      return
    }
    const category = filteredCategories.find(
      (item) => item.id === form.categoryId,
    )
    const method = methods.find((item) => item.id === form.paymentMethodId)
    saveMutation.mutate({
      editingId: editing?.id ?? null,
      description: form.description.trim(),
      amount,
      type: form.type,
      date: form.date || todayIso(),
      categoryId: form.categoryId,
      categoryName: category?.name ?? 'Category',
      paymentMethodId: form.paymentMethodId || null,
      paymentMethodName: method?.name ?? null,
    })
  }

  useEffect(() => {
    setQuery(qParam ?? '')
  }, [qParam])

  useEffect(() => {
    const trimmed = query.trim()
    const timer = window.setTimeout(() => {
      if ((qParam ?? '') === trimmed) return
      void navigate({
        search: (prev) => {
          const { q: _q, ...rest } = prev
          return trimmed ? { ...rest, q: trimmed } : rest
        },
        replace: true,
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, qParam, navigate])

  useEffect(() => {
    if (!openNew) return
    openCreateInContext()
    stripComposerSearch()
  }, [openNew])

  useEffect(() => {
    if (!editId || !transactionsQuery.data) return
    const row = transactionsQuery.data.find(
      (transaction) => transaction.id === editId,
    )
    if (row) openEdit(row)
    stripComposerSearch()
  }, [editId, transactionsQuery.data])

  useEffect(() => {
    if (!composerOpen || editing) return
    if (form.categoryId) {
      const stillValid = filteredCategories.some(
        (category) => category.id === form.categoryId,
      )
      if (stillValid) return
    }
    const preferred = readTransactionDefaults().categoryIdByType[form.type]
    const next =
      filteredCategories.find((category) => category.id === preferred) ??
      filteredCategories[0]
    if (next) {
      setForm((current) => ({ ...current, categoryId: next.id }))
    }
  }, [composerOpen, editing, form.categoryId, form.type, filteredCategories])

  useEffect(() => {
    if (!composerOpen) return
    const frame = window.requestAnimationFrame(() => {
      descriptionRef.current?.focus()
      descriptionRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [composerOpen, editing])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (composerOpen || deleting) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        openCreateInContext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [composerOpen, deleting, monthFilter])

  if (transactionsQuery.isPending || settingsQuery.isPending) {
    return <PageLoading label="Loading ledger…" />
  }

  if (transactionsQuery.isError || settingsQuery.isError) {
    return (
      <PageError
        title="Could not load ledger"
        message={
          transactionsQuery.error?.message ?? settingsQuery.error?.message
        }
        onRetry={() => {
          void transactionsQuery.refetch()
          void settingsQuery.refetch()
        }}
      />
    )
  }

  const allCount = transactionsQuery.data.length
  const currency = settingsQuery.data.currency
  const viewingMonth =
    monthFilter && monthFilter !== 'all' ? monthFilter : null

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        description={
          viewingMonth ? formatYearMonth(viewingMonth) : 'All transactions.'
        }
        actions={
          <ResponsiveModal
            open={composerOpen}
            onOpenChange={(open) => {
              if (!open) {
                reset()
                saveMutation.reset()
              } else {
                setComposerOpen(true)
              }
            }}
          >
            <ResponsiveModalTrigger asChild>
              <Button size="sm" onClick={openCreateInContext}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add transaction</span>
                <kbd className="app-kbd app-kbd-on-primary ml-1.5 hidden sm:inline-flex">
                  N
                </kbd>
              </Button>
            </ResponsiveModalTrigger>
            <ResponsiveModalContent className="sm:max-w-md">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitForm()
                }}
              >
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    {editing ? 'Edit transaction' : 'Add transaction'}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Saved on this device.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <div className="grid gap-4 py-2">
                  <div
                    className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1"
                    role="group"
                    aria-label="Transaction type"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-8',
                        form.type === 'expense'
                          ? 'bg-card text-expense shadow-sm ring-1 ring-expense/25 hover:bg-card hover:text-expense'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setType('expense')}
                    >
                      Expense
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-8',
                        form.type === 'income'
                          ? 'bg-card text-income shadow-sm ring-1 ring-income/25 hover:bg-card hover:text-income'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setType('income')}
                    >
                      Income
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ledger-description">Description</Label>
                    <Input
                      ref={descriptionRef}
                      id="ledger-description"
                      name="description"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Coffee shop…"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="ledger-amount">Amount</Label>
                      <Input
                        id="ledger-amount"
                        name="amount"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        autoComplete="off"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ledger-date">Date</Label>
                      <Input
                        id="ledger-date"
                        name="date"
                        type="date"
                        autoComplete="off"
                        value={form.date}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ledger-category">Category</Label>
                    <Select
                      value={form.categoryId || '__unset__'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          categoryId: value === '__unset__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="ledger-category" className="w-full">
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__unset__" disabled>
                            Choose category
                          </SelectItem>
                          {filteredCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ledger-method">Payment method</Label>
                    <Select
                      value={form.paymentMethodId || '__none__'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          paymentMethodId: value === '__none__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="ledger-method" className="w-full">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__none__">None</SelectItem>
                          {methods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  {saveError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {saveError}
                    </p>
                  ) : null}
                </div>
                <ResponsiveModalFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset()
                      saveMutation.reset()
                    }}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </ResponsiveModalFooter>
              </form>
            </ResponsiveModalContent>
          </ResponsiveModal>
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>
            Showing {rows.length} of {allCount} entries ·{' '}
            <AnimatedMoney
              amount={totals.expenses}
              currency={currency}
              showDelta={false}
            />{' '}
            spent ·{' '}
            <AnimatedMoney
              amount={totals.income}
              currency={currency}
              showDelta={false}
            />{' '}
            income
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) =>
                setFilter(value as 'all' | TransactionType)
              }
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ledger"
                className="pl-8"
                aria-label="Search ledger"
              />
            </div>
          </div>

          {urlFiltersActive || filter !== 'all' || query.trim() ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {viewingMonth ? (
                <Badge variant="secondary">{formatYearMonth(viewingMonth)}</Badge>
              ) : null}
              {monthFilter === 'all' ? (
                <Badge variant="secondary">All months</Badge>
              ) : null}
              {categoryFilterName ? (
                <Badge variant="secondary">{categoryFilterName}</Badge>
              ) : null}
              {methodFilterName ? (
                <Badge variant="secondary">{methodFilterName}</Badge>
              ) : null}
              {filter !== 'all' ? (
                <Badge variant="outline" className="capitalize">
                  {filter}
                </Badge>
              ) : null}
              {query.trim() ? (
                <Badge variant="outline">“{query.trim()}”</Badge>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : null}

          {/* Phone list */}
          <div className="md:hidden">
            {allCount === 0 ? (
              <EmptyState
                icon={<Receipt />}
                title="Your ledger is empty"
                description="Add a transaction to start tracking."
                action={
                  <Button size="sm" onClick={openCreateInContext}>
                    <Plus data-icon="inline-start" />
                    Add
                  </Button>
                }
              />
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                title="No matching transactions"
                description="Clear filters to see more of your ledger."
                action={
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <MobileList>
                {rows.map((transaction) => (
                  <MobileListRow
                    key={transaction.id}
                    title={transaction.description}
                    meta={`${transaction.category}${transaction.paymentMethod ? ` · ${transaction.paymentMethod}` : ''} · ${formatIsoDate(transaction.date)}`}
                    trailing={
                      <span className={amountToneClass(transaction.type)}>
                        {signedAmountPrefix(transaction.type)}
                        {money(transaction.amount, currency)}
                      </span>
                    }
                    onClick={() => openEdit(transaction)}
                    actions={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-11 min-w-11"
                            aria-label={`Actions for ${transaction.description}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEdit(transaction)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              deleteMutation.reset()
                              setDeleting(transaction)
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                ))}
              </MobileList>
            )}
          </div>

          <TableScroll className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Amount
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCount === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        icon={<Receipt />}
                        title="Your ledger is empty"
                        description="Add a transaction to start tracking."
                        action={
                          <Button size="sm" onClick={openCreateInContext}>
                            <Plus data-icon="inline-start" />
                            Add
                            <kbd className="app-kbd app-kbd-on-primary ml-1.5 hidden sm:inline-flex">
                              N
                            </kbd>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        compact
                        title="No matching transactions"
                        description="Clear filters to see more of your ledger."
                        action={
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {transaction.paymentMethodId &&
                        transaction.paymentMethod ? (
                          <button
                            type="button"
                            className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() =>
                              filterByMethod(transaction.paymentMethodId!)
                            }
                          >
                            {transaction.paymentMethod}
                          </button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatIsoDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.type === 'income'
                              ? 'badge-income capitalize'
                              : 'badge-expense capitalize'
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right whitespace-nowrap tabular-nums',
                          amountToneClass(transaction.type),
                        )}
                      >
                        {signedAmountPrefix(transaction.type)}
                        {money(transaction.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${transaction.description}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEdit(transaction)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                deleteMutation.reset()
                                setDeleting(transaction)
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableScroll>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.description ?? 'transaction'}”?`}
        description="This transaction will be removed. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </PageShell>
  )
}
