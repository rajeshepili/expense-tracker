import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Repeat } from 'lucide-react'
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
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import {
  createRecurring,
  getMonthBudget,
  deleteRecurring,
  getSettings,
  listCategories,
  listRecurring,
  setRecurringActive,
  updateRecurring,
} from '#/data/repository'
import {
  cadenceLabel,
  formatIsoDate,
  money,
  monthlyEquivalent,
  percent,
  todayIso,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { RecurrenceCadence, RecurringExpenseRow } from '#/lib/types'

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
})

type FormState = {
  name: string
  amount: string
  categoryId: string
  cadence: RecurrenceCadence
  nextDate: string
}

const emptyForm = (): FormState => ({
  name: '',
  amount: '',
  categoryId: '',
  cadence: 'monthly',
  nextDate: todayIso(),
})

function formFromRow(row: RecurringExpenseRow): FormState {
  return {
    name: row.name,
    amount: String(row.amount),
    categoryId: row.categoryId,
    cadence: row.cadence,
    nextDate: row.nextDate,
  }
}

function RecurringPage() {
  const queryClient = useQueryClient()
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringExpenseRow | null>(null)
  const [deleting, setDeleting] = useState<RecurringExpenseRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

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
          active: editing.active,
        })
      } else {
        await createRecurring({
          name: form.name,
          amount,
          cadence: form.cadence,
          nextDate: form.nextDate,
          categoryId: form.categoryId,
          active: true,
        })
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['recurring', 'categories'])
      setComposerOpen(false)
      setEditing(null)
      setForm(emptyForm())
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setRecurringActive(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.recurring })
      const previous = queryClient.getQueryData<RecurringExpenseRow[]>(
        queryKeys.recurring,
      )
      queryClient.setQueryData<RecurringExpenseRow[]>(
        queryKeys.recurring,
        (current) =>
          current?.map((row) => (row.id === id ? { ...row, active } : row)),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.recurring, context.previous)
      }
    },
    onSettled: () => invalidateAfter(queryClient, ['recurring']),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No recurring item selected')
      await deleteRecurring(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['recurring', 'categories'])
      setDeleting(null)
    },
  })

  const items = recurringQuery.data ?? []
  const monthlyBudget =
    monthBudgetQuery.data?.budget ?? settingsQuery.data?.budget ?? 0
  const currency = settingsQuery.data?.currency ?? 'USD'
  const expenseCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.type === 'expense',
  )

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

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setComposerOpen(true)
  }

  function openEdit(row: RecurringExpenseRow) {
    setEditing(row)
    setForm(formFromRow(row))
    setComposerOpen(true)
  }

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
          <Dialog
            open={composerOpen}
            onOpenChange={(open) => {
              setComposerOpen(open)
              if (!open) {
                setEditing(null)
                setForm(emptyForm())
                saveMutation.reset()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                Add recurring
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Edit recurring expense' : 'Add recurring expense'}
              </DialogTitle>
              <DialogDescription>
                Saved on this device.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="recurring-name">Name</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recurring-amount">Amount</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recurring-category">Category</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recurring-cadence">Cadence</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recurring-next">Next date</Label>
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
              </div>
              {saveMutation.isError ? (
                <p className="text-sm text-destructive">
                  {saveMutation.error.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setComposerOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Active monthly load
          </p>
          <AnimatedMoney
            persistKey="recurring:monthly-total"
            amount={monthlyTotal}
            currency={currency}
            goodWhen="down"
            className="mt-1 text-xl font-semibold tracking-tight"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            From weekly / monthly / yearly cadences
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Of this month's budget
          </p>
          <AnimatedPercent
            persistKey="recurring:of-budget"
            value={ofBudget}
            goodWhen="down"
            className="mt-1 text-xl font-semibold tracking-tight"
          />
          <Progress
            className="mt-2 h-1.5"
            value={Math.min(ofBudget * 100, 100)}
            aria-label="Recurring share of budget"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            of {money(monthlyBudget, currency)} this month
          </p>
        </div>
      </section>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Recurring expenses</CardTitle>
          <CardDescription>
            Toggle active items to see budget impact update.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-1">
          <TableScroll>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Cadence</TableHead>
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
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      icon={<Repeat />}
                      title="No recurring expenses"
                      description="Track rent, subscriptions, and other repeats so they count toward your budget."
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
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {cadenceLabel[item.cadence]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatIsoDate(item.nextDate, true)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {money(item.amount, currency)}
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
    </PageShell>
  )
}
