import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartPie,
  List,
  MoreHorizontal,
  Plus,
  Receipt,
  Repeat,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { Kbd } from '#/components/ui/kbd'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
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
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  AnimatedMoney,
  AnimatedPercent,
} from '#/components/animated-number'
import { CategorySpendChart } from '#/components/category-spend-chart'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import {
  BackupPanel,
  BackupReminder,
  LocalDataCallout,
} from '#/components/local-data'
import { StatTile } from '#/components/stat-tile'
import {
  clearMonthBudget,
  deleteTransaction,
  getOverview,
  setMonthBudget,
  updateSettings,
} from '#/data/repository'
import type { LedgerTransaction } from '#/lib/types'
import {
  amountToneClass,
  CURRENCIES,
  currencyLabel,
  formatIsoDate,
  formatYearMonth,
  isCurrencyCode,
  money,
  monthBudgetMatchesDefault,
  signedAmountPrefix,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { prefetchRoute } from '#/lib/query/prefetch'
import { queryKeys } from '#/lib/query/keys'
import { cn } from 'cn'

export const Route = createFileRoute('/')({ component: Home })

type CategoryView = 'list' | 'chart'

const CATEGORY_VIEW_KEY = 'expense-tracker-category-view'

function readCategoryView(): CategoryView {
  if (typeof window === 'undefined') return 'list'
  return window.localStorage.getItem(CATEGORY_VIEW_KEY) === 'chart'
    ? 'chart'
    : 'list'
}

function Home() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [defaultBudgetDraft, setDefaultBudgetDraft] = useState('')
  const [monthBudgetDraft, setMonthBudgetDraft] = useState('')
  const [currencyDraft, setCurrencyDraft] = useState('USD')
  const [categoryView, setCategoryView] = useState<CategoryView>(readCategoryView)
  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: async () => {
      const overview = await getOverview()
      queryClient.setQueryData(queryKeys.settings, overview.settings)
      return overview
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No transaction selected')
      await deleteTransaction(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['transactions', 'categories'])
      setDeleting(null)
    },
  })

  const settingsMutation = useMutation({
    mutationFn: async () => {
      const defaultBudget = Number(defaultBudgetDraft)
      const monthBudget = Number(monthBudgetDraft)
      if (!Number.isFinite(defaultBudget) || defaultBudget < 0) {
        throw new Error('Enter a valid default budget (0 or more)')
      }
      if (!Number.isFinite(monthBudget) || monthBudget < 0) {
        throw new Error('Enter a valid budget for this month (0 or more)')
      }
      const currency = currencyDraft.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error('Choose a valid currency')
      }
      try {
        money(0, currency)
      } catch {
        throw new Error('Choose a valid currency')
      }

      const yearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!yearMonth) throw new Error('Could not resolve the current month')

      await updateSettings({ budget: defaultBudget, currency })
      if (monthBudgetMatchesDefault(monthBudget, defaultBudget)) {
        await clearMonthBudget(yearMonth)
      } else {
        await setMonthBudget(yearMonth, monthBudget)
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['settings'])
      setSettingsOpen(false)
    },
  })

  const revertMonthMutation = useMutation({
    mutationFn: async () => {
      const yearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!yearMonth) throw new Error('Could not resolve the current month')
      await clearMonthBudget(yearMonth)
    },
    onSuccess: async () => {
      const defaultBudget =
        overviewQuery.data?.monthBudget.defaultBudget ??
        Number(defaultBudgetDraft)
      setMonthBudgetDraft(String(defaultBudget))
      await invalidateAfter(queryClient, ['settings'])
    },
  })

  function openSettingsEditor() {
    const data = overviewQuery.data
    if (!data) return
    setDefaultBudgetDraft(String(data.monthBudget.defaultBudget))
    setMonthBudgetDraft(String(data.monthBudget.budget))
    setCurrencyDraft(data.settings.currency.trim().toUpperCase() || 'USD')
    settingsMutation.reset()
    revertMonthMutation.reset()
    setSettingsOpen(true)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (settingsOpen || deleting) return
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
        prefetchRoute(queryClient, '/ledger')
        void navigate({ to: '/ledger', search: { new: true } })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen, deleting, navigate, queryClient])

  if (overviewQuery.isPending) {
    return <PageLoading label="Loading overview…" />
  }

  if (overviewQuery.isError) {
    return (
      <PageError
        title="Could not load overview"
        message={overviewQuery.error.message}
        onRetry={() => void overviewQuery.refetch()}
      />
    )
  }

  const {
    summary,
    remaining,
    budgetUsed,
    categories,
    recentTransactions,
    recurringMonthly,
    recurringOfBudget,
    upcomingRecurring,
    settings,
    monthBudget,
  } = overviewQuery.data
  const monthLabel = formatYearMonth(monthBudget.yearMonth)
  const effectiveBudget = monthBudget.budget

  return (
    <PageShell>
      <LocalDataCallout />
      <BackupReminder />
      <PageHeader
        title="Overview"
        description={`${monthLabel} · tracked against this month's budget.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openSettingsEditor}>
              <Wallet aria-hidden="true" data-icon="inline-start" />
              <span className="hidden sm:inline">Budget</span>
              <span className="sr-only sm:hidden">Budget</span>
            </Button>
            <Button asChild size="sm">
              <Link
                to="/ledger"
                search={{ new: true }}
                onMouseEnter={() => prefetchRoute(queryClient, '/ledger')}
                onFocus={() => prefetchRoute(queryClient, '/ledger')}
              >
                <Plus data-icon="inline-start" />
                <span className="hidden sm:inline">Add</span>
                <span className="sr-only sm:hidden">Add transaction</span>
                <Kbd className="bg-primary-foreground/15 text-primary-foreground">
                  N
                </Kbd>
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Income"
          tone="income"
          icon={<ArrowDownLeft />}
          value={
            <AnimatedMoney
              persistKey="overview:income"
              amount={summary.income}
              currency={settings.currency}
              goodWhen="up"
              className="text-xl font-semibold tracking-tight text-income"
            />
          }
          hint={monthLabel}
        />
        <StatTile
          label="Expenses"
          tone="expense"
          icon={<ArrowUpRight />}
          value={
            <AnimatedMoney
              persistKey="overview:expenses"
              amount={summary.expenses}
              currency={settings.currency}
              goodWhen="down"
              className="text-xl font-semibold tracking-tight text-expense"
            />
          }
          hint={monthLabel}
        />
        <StatTile
          label="Budget left"
          icon={<Wallet />}
          value={
            <AnimatedMoney
              persistKey="overview:remaining"
              amount={remaining}
              currency={settings.currency}
              goodWhen="up"
              className="text-xl font-semibold tracking-tight"
            />
          }
          hint={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              of {money(effectiveBudget, settings.currency)}
              {monthBudget.isCustom ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Custom
                </Badge>
              ) : null}
            </span>
          }
        />
        <StatTile
          label="Budget used"
          icon={<ChartPie />}
          value={
            <AnimatedPercent
              persistKey="overview:budget-used"
              value={budgetUsed}
              goodWhen="down"
              className="text-xl font-semibold tracking-tight"
            />
          }
          hint={
            <Progress
              className="mt-1.5 h-1.5"
              value={Math.min(budgetUsed * 100, 100)}
              aria-label="Budget used"
            />
          }
        />
      </section>

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <Card className="flex min-h-0 min-w-0 flex-col gap-0 py-0">
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <CardDescription>Latest local activity</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/ledger">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-1">
            <TableScroll>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[7.5rem] text-right whitespace-nowrap">
                    Amount
                  </TableHead>
                  <TableHead className="w-10 pr-3">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        compact
                        icon={<Receipt />}
                        title="No transactions yet"
                        description="Log your first expense or income to see activity here."
                        action={
                          <Button asChild size="sm">
                            <Link
                              to="/ledger"
                              search={{ new: true }}
                              onMouseEnter={() =>
                                prefetchRoute(queryClient, '/ledger')
                              }
                            >
                              <Plus data-icon="inline-start" />
                              Add
                            </Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatIsoDate(transaction.date)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right whitespace-nowrap tabular-nums',
                          amountToneClass(transaction.type),
                        )}
                      >
                        {signedAmountPrefix(transaction.type)}
                        {money(transaction.amount, settings.currency)}
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
                            <DropdownMenuItem asChild>
                              <Link to="/ledger">Edit in ledger</Link>
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

        <div className="scroll-panel flex min-h-0 flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Categories vs budget</CardTitle>
              <CardDescription>
                {categoryView === 'chart'
                  ? `Spend vs ${money(effectiveBudget, settings.currency)}`
                  : `Share of this month’s budget`}
              </CardDescription>
              {categories.length > 0 ? (
                <CardAction>
                  <Tabs
                    value={categoryView}
                    onValueChange={(value) => {
                      const next = value === 'chart' ? 'chart' : 'list'
                      setCategoryView(next)
                      window.localStorage.setItem(CATEGORY_VIEW_KEY, next)
                    }}
                  >
                    <TabsList variant="default" className="h-8">
                      <TabsTrigger
                        value="list"
                        className="gap-1.5 px-2.5 text-xs"
                        aria-label="List view"
                      >
                        <List className="size-3.5" aria-hidden />
                        <span className="hidden sm:inline">List</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="chart"
                        className="gap-1.5 px-2.5 text-xs"
                        aria-label="Chart view"
                      >
                        <ChartPie className="size-3.5" aria-hidden />
                        <span className="hidden sm:inline">Chart</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-4">
              {categories.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ChartPie />}
                  title="No spend by category yet"
                  description={`${monthLabel} expenses will show up here.`}
                />
              ) : categoryView === 'chart' ? (
                <CategorySpendChart
                  categories={categories}
                  budget={effectiveBudget}
                  currency={settings.currency}
                />
              ) : (
                categories.map((category) => (
                  <div key={category.name} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">
                        {category.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <AnimatedMoney
                          amount={category.amount}
                          currency={settings.currency}
                          showDelta={false}
                        />{' '}
                        ·{' '}
                        <AnimatedPercent
                          value={category.ofBudget}
                          showDelta={false}
                        />
                      </span>
                    </div>
                    <Progress
                      className="h-1.5"
                      value={Math.min(category.ofBudget * 100, 100)}
                      aria-label={`${category.name} share of budget`}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Recurring</CardTitle>
              <CardDescription>
                <AnimatedMoney
                  persistKey="overview:recurring-monthly"
                  amount={recurringMonthly}
                  currency={settings.currency}
                  showDelta={false}
                />{' '}
                / mo ·{' '}
                <AnimatedPercent
                  persistKey="overview:recurring-of-budget"
                  value={recurringOfBudget}
                  showDelta={false}
                />{' '}
                of budget
              </CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Manage recurring">
                  <Link to="/recurring">
                    <Repeat />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 py-4">
              <Progress
                className="h-1.5"
                value={Math.min(recurringOfBudget * 100, 100)}
                aria-label="Recurring share of this month's budget"
              />
              {upcomingRecurring.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Repeat />}
                  title="No active recurring"
                  description="Set up rent, subscriptions, or other repeats."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link to="/recurring">
                        <Repeat data-icon="inline-start" />
                        Manage
                      </Link>
                    </Button>
                  }
                />
              ) : (
                upcomingRecurring.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Next {formatIsoDate(item.nextDate)}
                      </p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                      {money(item.amount, settings.currency)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

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
        onConfirm={() => deleteMutation.mutate()}
      />

      <Dialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open)
          if (!open) {
            settingsMutation.reset()
            revertMonthMutation.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Budget & currency</DialogTitle>
            <DialogDescription>
              Set a default monthly budget, or a one-off amount for {monthLabel}.
              Percentages use this month’s budget.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="display-currency">Currency</Label>
              <Select value={currencyDraft} onValueChange={setCurrencyDraft}>
                <SelectTrigger id="display-currency" className="w-full">
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(isCurrencyCode(currencyDraft)
                      ? CURRENCIES
                      : [currencyDraft, ...CURRENCIES]
                    ).map((code) => (
                      <SelectItem key={code} value={code}>
                        {currencyLabel(code)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default-budget">
                Default monthly budget ({currencyDraft})
              </Label>
              <Input
                id="default-budget"
                name="defaultBudget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoComplete="off"
                value={defaultBudgetDraft}
                onChange={(event) => setDefaultBudgetDraft(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used every month unless you set a custom amount below.
              </p>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="month-budget">
                  This month’s budget · {monthLabel}
                </Label>
                {monthBudget.isCustom ||
                monthBudgetDraft !== defaultBudgetDraft ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setMonthBudgetDraft(defaultBudgetDraft)
                      if (monthBudget.isCustom) revertMonthMutation.mutate()
                    }}
                    disabled={
                      settingsMutation.isPending ||
                      revertMonthMutation.isPending
                    }
                  >
                    <RotateCcw data-icon="inline-start" />
                    Use default
                  </Button>
                ) : null}
              </div>
              <Input
                id="month-budget"
                name="monthBudget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoComplete="off"
                value={monthBudgetDraft}
                onChange={(event) => setMonthBudgetDraft(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {monthBudget.isCustom
                  ? `Custom for ${monthLabel}. Revert anytime to the default.`
                  : 'Matches your default until you change it.'}
              </p>
            </div>
            {settingsMutation.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {settingsMutation.error.message}
              </p>
            ) : null}
            {revertMonthMutation.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {revertMonthMutation.error.message}
              </p>
            ) : null}
            <BackupPanel />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              disabled={settingsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => settingsMutation.mutate()}
              disabled={settingsMutation.isPending}
            >
              {settingsMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
