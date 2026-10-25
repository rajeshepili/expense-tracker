import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Repeat } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Progress } from '#/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { AnimatedMoney, AnimatedPercent } from '#/components/animated-number'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { MobileList, MobileListRow } from '#/components/layout/mobile-list'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import { RecordRecurringControls } from '#/components/record-recurring-controls'
import {
  createRecurring,
  getMonthBudget,
  deleteRecurring,
  getSettings,
  listCategories,
  listPaymentMethods,
  listRecurring,
  setRecurringActive,
  updateRecurring,
} from '#/data/repository'
import { useComposer } from '#/hooks/use-composer'
import { useOptimisticMutation } from '#/hooks/use-optimistic-mutation'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  cadenceLabel,
  amountDue,
  canOneTapRecord,
  dueStatus,
  formatIsoDate,
  money,
  monthlyEquivalent,
  percent,
  todayIso,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'
import type { RecurrenceCadence, RecurringExpenseRow } from '#/lib/types'

function dueBadge(nextDate: string) {
  const status = dueStatus(nextDate)
  if (status === 'overdue') {
    return <Badge variant="destructive">Overdue</Badge>
  }
  if (status === 'due') {
    return <Badge>Due</Badge>
  }
  return null
}

function sortRecurring(items: RecurringExpenseRow[]) {
  const today = todayIso()
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    const aDue = dueStatus(a.nextDate, today)
    const bDue = dueStatus(b.nextDate, today)
    const rank = (s: ReturnType<typeof dueStatus>) =>
      s === 'overdue' ? 0 : s === 'due' ? 1 : 2
    const byDue = rank(aDue) - rank(bDue)
    if (byDue !== 0) return byDue
    return a.nextDate.localeCompare(b.nextDate)
  })
}

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
})

type FormState = {
  name: string
  amount: string
  categoryId: string
  paymentMethodId: string
  cadence: RecurrenceCadence
  nextDate: string
}

const emptyForm = (): FormState => {
  const defaults = readTransactionDefaults()
  return {
    name: '',
    amount: '',
    categoryId: defaults.categoryIdByType.expense ?? '',
    paymentMethodId: defaults.paymentMethodId,
    cadence: 'monthly',
    nextDate: todayIso(),
  }
}

function formFromRow(row: RecurringExpenseRow): FormState {
  return {
    name: row.name,
    amount: String(row.amount),
    categoryId: row.categoryId,
    paymentMethodId: row.paymentMethodId ?? '',
    cadence: row.cadence,
    nextDate: row.nextDate,
  }
}

function RecurringPage() {
  const queryClient = useQueryClient()
  const recorder = useRecordRecurring()
  const [deleting, setDeleting] = useState<RecurringExpenseRow | null>(null)
  const [skipConfirm, setSkipConfirm] = useState<RecurringExpenseRow | null>(
    null,
  )
  const {
    editing,
    form,
    composerOpen,
    setForm,
    setComposerOpen,
    openCreate,
    openEdit,
    reset,
  } = useComposer<FormState, RecurringExpenseRow>({ emptyForm, formFromRow })

  const recurringQuery = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: listRecurring,
  })
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })
  const monthBudgetQuery = useQuery({
    queryKey: [...queryKeys.settings, 'month-budget'] as const,
    queryFn: () => getMonthBudget(),
  })
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    enabled: composerOpen,
  })
  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: listPaymentMethods,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount)
      if (!form.name.trim() || !Number.isFinite(amount) || amount < 0) {
        throw new Error('Enter a name and a valid amount')
      }
      if (!form.categoryId) throw new Error('Choose a category')
      if (editing) {
        await updateRecurring(editing.id, {
          name: form.name,
          amount,
          cadence: form.cadence,
          nextDate: form.nextDate,
          categoryId: form.categoryId,
          paymentMethodId: form.paymentMethodId || null,
          active: editing.active,
        })
      } else {
        await createRecurring({
          name: form.name,
          amount,
          cadence: form.cadence,
          nextDate: form.nextDate,
          categoryId: form.categoryId,
          paymentMethodId: form.paymentMethodId || null,
          active: true,
        })
      }
    },
    onSuccess: async () => {
      rememberTransactionDefaults({
        type: 'expense',
        categoryId: form.categoryId,
        paymentMethodId: form.paymentMethodId,
      })
      await invalidateAfter(queryClient, [
        'recurring',
        'categories',
        'paymentMethods',
      ])
      reset()
    },
  })

  const toggleMutation = useOptimisticMutation<
    RecurringExpenseRow[],
    { id: string; active: boolean }
  >({
    queryClient,
    queryKey: queryKeys.recurring,
    invalidateKeys: ['recurring'],
    mutationFn: ({ id, active }) => setRecurringActive(id, active),
    onMutate: ({ id, active }) => {
      queryClient.setQueryData<RecurringExpenseRow[]>(
        queryKeys.recurring,
        (current) =>
          current?.map((row) => (row.id === id ? { ...row, active } : row)),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No recurring item selected')
      await deleteRecurring(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'recurring',
        'categories',
        'paymentMethods',
      ])
      setDeleting(null)
    },
  })

  const items = useMemo(
    () => sortRecurring(recurringQuery.data ?? []),
    [recurringQuery.data],
  )
  const monthlyBudget =
    monthBudgetQuery.data?.budget ?? settingsQuery.data?.budget ?? 0
  const currency = settingsQuery.data?.currency ?? 'USD'
  const expenseCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.type === 'expense',
  )
  const paymentMethods = methodsQuery.data ?? []

  const monthlyTotal = useMemo(
    () =>
      items
        .filter((item) => item.active)
        .reduce(
          (sum, item) => sum + monthlyEquivalent(item.amount, item.cadence),
          0,
        ),
    [items],
  )
  const ofBudget = monthlyBudget > 0 ? monthlyTotal / monthlyBudget : 0

  if (
    recurringQuery.isPending ||
    settingsQuery.isPending ||
    monthBudgetQuery.isPending
  ) {
    return <PageLoading label="Loading recurring…" />
  }

  if (
    recurringQuery.isError ||
    settingsQuery.isError ||
    monthBudgetQuery.isError
  ) {
    return (
      <PageError
        title="Could not load recurring expenses"
        message={
          recurringQuery.error?.message ??
          settingsQuery.error?.message ??
          monthBudgetQuery.error?.message ??
          'Unknown error'
        }
        onRetry={() => {
          void recurringQuery.refetch()
          void settingsQuery.refetch()
          void monthBudgetQuery.refetch()
        }}
      />
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Recurring"
        description="Bills and subscriptions that hit every cycle."
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
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add recurring</span>
              </Button>
            </ResponsiveModalTrigger>
            <ResponsiveModalContent className="sm:max-w-md">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  saveMutation.mutate()
                }}
              >
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    {editing
                      ? 'Edit recurring expense'
                      : 'Add recurring expense'}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Saved on this device.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <FieldGroup className="gap-4 py-2">
                  <Field>
                    <FieldLabel htmlFor="recurring-name">Name</FieldLabel>
                    <Input
                      id="recurring-name"
                      name="name"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Internet bill…"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recurring-amount">Amount</FieldLabel>
                    <Input
                      id="recurring-amount"
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
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recurring-category">
                      Category
                    </FieldLabel>
                    <Select
                      value={form.categoryId || '__unset__'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          categoryId: value === '__unset__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="recurring-category" className="w-full">
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__unset__" disabled>
                            Choose category
                          </SelectItem>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recurring-method">
                      Payment method
                    </FieldLabel>
                    <Select
                      value={form.paymentMethodId || '__none__'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          paymentMethodId: value === '__none__' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id="recurring-method" className="w-full">
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__none__">None</SelectItem>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recurring-cadence">Cadence</FieldLabel>
                    <Select
                      value={form.cadence}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          cadence: value as RecurrenceCadence,
                        }))
                      }
                    >
                      <SelectTrigger id="recurring-cadence" className="w-full">
                        <SelectValue placeholder="Cadence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(
                            Object.keys(cadenceLabel) as RecurrenceCadence[]
                          ).map((cadence) => (
                            <SelectItem key={cadence} value={cadence}>
                              {cadenceLabel[cadence]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="recurring-next">Next date</FieldLabel>
                    <Input
                      id="recurring-next"
                      name="nextDate"
                      type="date"
                      autoComplete="off"
                      value={form.nextDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          nextDate: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  {saveMutation.isError ? (
                    <FieldError>{saveMutation.error.message}</FieldError>
                  ) : null}
                </FieldGroup>
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

      <section className="grid shrink-0 grid-cols-2 gap-2 md:gap-3">
        <div className="rounded-lg border bg-card px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Active monthly load
          </p>
          <AnimatedMoney
            persistKey="recurring:monthly-total"
            amount={monthlyTotal}
            currency={currency}
            goodWhen="down"
            className="mt-1 text-lg font-semibold tracking-tight md:text-xl"
          />
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            From weekly / monthly / yearly cadences
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Of this month's budget
          </p>
          <AnimatedPercent
            persistKey="recurring:of-budget"
            value={ofBudget}
            goodWhen="down"
            className="mt-1 text-lg font-semibold tracking-tight md:text-xl"
          />
          <Progress
            className="mt-2 h-1.5"
            value={Math.min(ofBudget * 100, 100)}
            aria-label="Recurring share of budget"
          />
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            of {money(monthlyBudget, currency)} this month
          </p>
        </div>
      </section>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Recurring expenses</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-1">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 md:hidden">
            {items.length === 0 ? (
              <EmptyState
                icon={<Repeat />}
                title="No recurring expenses"
                description="Track rent, subscriptions, and other repeats."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus data-icon="inline-start" />
                    Add
                  </Button>
                }
              />
            ) : (
              <MobileList>
                {items.map((item) => (
                  <MobileListRow
                    key={item.id}
                    className={!item.active ? 'opacity-60' : undefined}
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{item.name}</span>
                        {item.active ? dueBadge(item.nextDate) : null}
                      </span>
                    }
                    meta={`${item.category}${item.paymentMethod ? ` · ${item.paymentMethod}` : ''} · ${cadenceLabel[item.cadence]} · next ${formatIsoDate(item.nextDate, true)}${item.remainingAmount !== null ? ` · ${money(amountDue(item), currency)} left` : ''}`}
                    trailing={
                      <span className="tabular-nums">
                        {money(amountDue(item), currency)}
                      </span>
                    }
                    onClick={() => openEdit(item)}
                    actions={
                      <>
                        {item.active ? (
                          canOneTapRecord(item.nextDate) ? (
                            <Button
                              size="sm"
                              className="min-h-11 active:scale-[0.97]"
                              disabled={recorder.recording}
                              onClick={() => recorder.recordOneTap(item)}
                            >
                              Record
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-11 active:scale-[0.97]"
                              disabled={recorder.recording}
                              onClick={() => recorder.openAdjust(item)}
                            >
                              Pay early
                            </Button>
                          )
                        ) : null}
                        <Switch
                          checked={item.active}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              id: item.id,
                              active: checked,
                            })
                          }
                          aria-label={`Toggle ${item.name}`}
                          className="mr-1"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="min-h-11 min-w-11"
                              aria-label={`Actions for ${item.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.active ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => recorder.openAdjust(item)}
                                  disabled={recorder.recording}
                                >
                                  {canOneTapRecord(item.nextDate)
                                    ? 'Adjust…'
                                    : 'Pay early…'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setSkipConfirm(item)}
                                  disabled={recorder.recording}
                                >
                                  Skip
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                deleteMutation.reset()
                                setDeleting(item)
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
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
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Cadence
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Next</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Amount
                  </TableHead>
                  <TableHead className="hidden text-right whitespace-nowrap md:table-cell">
                    Monthly
                  </TableHead>
                  <TableHead className="hidden text-right whitespace-nowrap lg:table-cell">
                    Of budget
                  </TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-28">
                    <span className="sr-only">Record</span>
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="p-0">
                      <EmptyState
                        icon={<Repeat />}
                        title="No recurring expenses"
                        description="Track rent, subscriptions, and other repeats."
                        action={
                          <Button size="sm" onClick={openCreate}>
                            <Plus data-icon="inline-start" />
                            Add
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const monthly = monthlyEquivalent(item.amount, item.cadence)
                    const itemOfBudget =
                      monthlyBudget > 0 ? monthly / monthlyBudget : 0
                    return (
                      <TableRow
                        key={item.id}
                        className={!item.active ? 'opacity-60' : undefined}
                      >
                        <TableCell className="font-medium">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {item.name}
                            {item.active ? dueBadge(item.nextDate) : null}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {item.paymentMethod ?? '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">
                            {cadenceLabel[item.cadence]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground xl:table-cell">
                          {formatIsoDate(item.nextDate, true)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          <span className="block">
                            {money(amountDue(item), currency)}
                          </span>
                          {item.remainingAmount !== null ? (
                            <span className="block text-xs text-muted-foreground">
                              of {money(item.amount, currency)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-right whitespace-nowrap tabular-nums md:table-cell">
                          {money(monthly, currency)}
                        </TableCell>
                        <TableCell className="hidden text-right whitespace-nowrap tabular-nums lg:table-cell">
                          {item.active ? percent(itemOfBudget) : '—'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.active}
                            disabled={toggleMutation.isPending}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                id: item.id,
                                active: checked,
                              })
                            }
                            aria-label={`Toggle ${item.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          {item.active ? (
                            canOneTapRecord(item.nextDate) ? (
                              <Button
                                size="sm"
                                className="active:scale-[0.97]"
                                disabled={recorder.recording}
                                onClick={() => recorder.recordOneTap(item)}
                              >
                                Record
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="active:scale-[0.97]"
                                disabled={recorder.recording}
                                onClick={() => recorder.openAdjust(item)}
                              >
                                Pay early
                              </Button>
                            )
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${item.name}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.active ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => recorder.openAdjust(item)}
                                    disabled={recorder.recording}
                                  >
                                    {canOneTapRecord(item.nextDate)
                                      ? 'Adjust…'
                                      : 'Pay early…'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setSkipConfirm(item)}
                                    disabled={recorder.recording}
                                  >
                                    Skip
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                  deleteMutation.reset()
                                  setDeleting(item)
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableScroll>
        </CardContent>
      </Card>

      <RecordRecurringControls
        recorder={recorder}
        paymentMethods={paymentMethods}
        currencyHint={currency}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.name ?? 'recurring item'}”?`}
        description="This recurring expense will be removed. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDeleteDialog
        open={Boolean(skipConfirm)}
        onOpenChange={(open) => {
          if (!open) setSkipConfirm(null)
        }}
        title={`Skip “${skipConfirm?.name ?? 'bill'}”?`}
        description="Advances the next date without a ledger entry."
        confirmLabel="Skip"
        pending={recorder.skipping}
        onConfirm={() => {
          if (!skipConfirm) return
          recorder.skip(skipConfirm.id)
          setSkipConfirm(null)
        }}
      />
    </PageShell>
  )
}
