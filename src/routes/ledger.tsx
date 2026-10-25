import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
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
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import {
  createTransaction,
  deleteTransaction,
  getSettings,
  listCategories,
  listPaymentMethods,
  listTransactions,
  updateTransaction,
} from '#/data/repository'
import {
  amountToneClass,
  formatIsoDate,
  money,
  signedAmountPrefix,
  todayIso,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { cn } from 'cn'

type LedgerSearch = {
  new?: boolean
}

export const Route = createFileRoute('/ledger')({
  validateSearch: (search: Record<string, unknown>): LedgerSearch => ({
    new: search.new === true || search.new === '1' || search.new === 1,
  }),
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
  const { new: openNew } = Route.useSearch()
  const descriptionRef = useRef<HTMLInputElement>(null)

  const [filter, setFilter] = useState<'all' | TransactionType>('all')
  const [query, setQuery] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saveError, setSaveError] = useState<string | null>(null)

  const transactionsQuery = useQuery({
    queryKey: queryKeys.transactions,
    queryFn: listTransactions,
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

  const saveMutation = useMutation({
    mutationFn: async (vars: SaveVars) => {
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
    onMutate: async (vars) => {
      setSaveError(null)
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions })
      const previous = queryClient.getQueryData<LedgerTransaction[]>(
        queryKeys.transactions,
      )

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

      setComposerOpen(false)
      setEditing(null)
      setForm(emptyForm())

      return { previous, tempId: vars.editingId ? null : nextRow.id }
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
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.transactions, context.previous)
      }
      setSaveError(
        error instanceof Error ? error.message : 'Could not save transaction',
      )
      setComposerOpen(true)
    },
    onSettled: () => {
      void invalidateAfter(queryClient, ['transactions', 'categories'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTransaction(id)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions })
      const previous = queryClient.getQueryData<LedgerTransaction[]>(
        queryKeys.transactions,
      )
      queryClient.setQueryData<LedgerTransaction[]>(
        queryKeys.transactions,
        (current) => current?.filter((row) => row.id !== id),
      )
      setDeleting(null)
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.transactions, context.previous)
      }
    },
    onSettled: () => {
      void invalidateAfter(queryClient, ['transactions', 'categories'])
    },
  })

  const rows = useMemo(() => {
    const all = transactionsQuery.data ?? []
    const normalized = query.trim().toLowerCase()
    return all.filter((transaction) => {
      if (filter !== 'all' && transaction.type !== filter) return false
      if (!normalized) return true
      return (
        transaction.description.toLowerCase().includes(normalized) ||
        transaction.category.toLowerCase().includes(normalized) ||
        (transaction.paymentMethod ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [filter, query, transactionsQuery.data])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.type === 'income') acc.income += row.amount
        else acc.expenses += row.amount
        return acc
      },
      { income: 0, expenses: 0 },
    )
  }, [rows])

  function openCreate() {
    setEditing(null)
    setSaveError(null)
    setForm(emptyForm())
    setComposerOpen(true)
  }

  function openEdit(row: LedgerTransaction) {
    setEditing(row)
    setSaveError(null)
    setForm(formFromTransaction(row))
    setComposerOpen(true)
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
    if (!openNew) return
    setEditing(null)
    setSaveError(null)
    setForm(emptyForm())
    setComposerOpen(true)
    void navigate({ search: {}, replace: true })
  }, [openNew, navigate])

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
        openCreate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [composerOpen, deleting])

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

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        description="Transactions saved in your local database."
        actions={
          <Dialog
            open={composerOpen}
            onOpenChange={(open) => {
              setComposerOpen(open)
              if (!open) {
                setEditing(null)
                setForm(emptyForm())
                setSaveError(null)
                saveMutation.reset()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Add transaction
                <kbd className="app-kbd app-kbd-on-primary ml-1.5 hidden sm:inline-flex">
                  N
                </kbd>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitForm()
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    {editing ? 'Edit transaction' : 'Add transaction'}
                  </DialogTitle>
                  <DialogDescription>
                    Saved on this device. Press Enter to save.
                  </DialogDescription>
                </DialogHeader>
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setComposerOpen(false)}
                    disabled={saveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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

          <TableScroll>
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
                        description="Add a transaction to start tracking. Press N anytime."
                        action={
                          <Button size="sm" onClick={openCreate}>
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
                        description="Try clearing search or switching the type filter."
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
                        {transaction.paymentMethod ?? '—'}
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
        description="This transaction will be removed from your local ledger. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </PageShell>
  )
}
