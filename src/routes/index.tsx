import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartPie,
  ChevronLeft,
  ChevronRight,
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
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
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
import { AnimatedMoney, AnimatedPercent } from '#/components/animated-number'
import { CategorySpendChart } from '#/components/category-spend-chart'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { MobileList, MobileListRow } from '#/components/layout/mobile-list'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import {
  BackupPanel,
  BackupReminder,
  LocalDataCallout,
} from '#/components/local-data'
import { StatTile } from '#/components/stat-tile'
import { RecordRecurringControls } from '#/components/record-recurring-controls'
import {
  clearMonthBudget,
  deleteTransaction,
  getOverview,
  listPaymentMethods,
  setMonthBudget,
  updateSettings,
} from '#/data/repository'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import type { LedgerTransaction } from '#/lib/types'
import {
  amountToneClass,
  CURRENCIES,
  currencyLabel,
  currentYearMonth,
  amountDue,
  canOneTapRecord,
  dueStatus,
  formatIsoDate,
  formatYearMonth,
  isCurrencyCode,
  isYearMonth,
  money,
  monthBudgetMatchesDefault,
  percent,
  priorDeltaRatio,
  shiftYearMonth,
  signedAmountPrefix,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import { prefetchRoute } from '#/lib/query/prefetch'
import { queryKeys } from '#/lib/query/keys'
import { cn } from 'cn'

type OverviewSearch = {
  month?: string
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): OverviewSearch => {
    const month = typeof search.month === 'string' ? search.month : undefined
    return {
      month: month && isYearMonth(month) ? month : undefined,
    }
  },
  component: Home,
})

function quietDelta(current: number, prior: number) {
  const ratio = priorDeltaRatio(current, prior)
  if (ratio === null) return 'new vs prior'
  if (ratio === 0) return 'same as prior'
  const sign = ratio > 0 ? '+' : '−'
  return `${sign}${percent(Math.abs(ratio))} vs prior`
}

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
  const { month: monthParam } = Route.useSearch()
  const yearMonth = monthParam ?? currentYearMonth()
  const isCurrentMonth = yearMonth === currentYearMonth()
  const recorder = useRecordRecurring()
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [defaultBudgetDraft, setDefaultBudgetDraft] = useState('')
  const [monthBudgetDraft, setMonthBudgetDraft] = useState('')
  const [currencyDraft, setCurrencyDraft] = useState('USD')
  const [categoryView, setCategoryView] =
    useState<CategoryView>(readCategoryView)
  const overviewQuery = useQuery({
    queryKey: queryKeys.overviewMonth(yearMonth),
    queryFn: async () => {
      const overview = await getOverview(yearMonth)
      queryClient.setQueryData(queryKeys.settings, overview.settings)
      return overview
    },
  })
  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: listPaymentMethods,
  })

  function goMonth(next: string) {
    void navigate({
      to: '/',
      search: next === currentYearMonth() ? {} : { month: next },
    })
  }

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

      const targetYearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!targetYearMonth) throw new Error('Could not resolve the current month')

      await updateSettings({ budget: defaultBudget, currency })
      if (monthBudgetMatchesDefault(monthBudget, defaultBudget)) {
        await clearMonthBudget(targetYearMonth)
      } else {
        await setMonthBudget(targetYearMonth, monthBudget)
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['settings'])
      setSettingsOpen(false)
    },
  })

  const revertMonthMutation = useMutation({
    mutationFn: async () => {
      const targetYearMonth = overviewQuery.data?.monthBudget.yearMonth
      if (!targetYearMonth) throw new Error('Could not resolve the current month')
      await clearMonthBudget(targetYearMonth)
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
        void navigate({
          to: '/ledger',
          search: { new: true, month: yearMonth },
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen, deleting, navigate, queryClient, yearMonth])

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
    priorSummary,
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
  const paymentMethods = methodsQuery.data ?? []

  return (
    <PageShell scroll="page">
      <LocalDataCallout compact className="md:hidden" />
      <LocalDataCallout className="hidden md:block" />
      <BackupReminder />
      <PageHeader
        title="Overview"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
                aria-label="Previous month"
                onClick={() => goMonth(shiftYearMonth(yearMonth, -1))}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-[9.5rem] text-center font-medium text-foreground">
                {monthLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
                aria-label="Next month"
                onClick={() => goMonth(shiftYearMonth(yearMonth, 1))}
              >
                <ChevronRight />
              </Button>
            </span>
            {!isCurrentMonth ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => goMonth(currentYearMonth())}
              >
                This month
              </Button>
            ) : null}
            <span className="text-muted-foreground">
              · tracked against this month&apos;s budget.
            </span>
          </span>
        }
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
                search={{ new: true, month: yearMonth }}
                onMouseEnter={() => prefetchRoute(queryClient, '/ledger')}
                onFocus={() => prefetchRoute(queryClient, '/ledger')}
              >
                <Plus data-icon="inline-start" />
                <span className="hidden sm:inline">Add</span>
                <span className="sr-only sm:hidden">Add transaction</span>
                <Kbd className="hidden bg-primary-foreground/15 text-primary-foreground md:inline-flex">
                  N
                </Kbd>
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4">
        <StatTile
          label="Income"
          tone="income"
          icon={<ArrowDownLeft />}
          className="px-3 py-2.5 md:px-4 md:py-3"
          value={
            <AnimatedMoney
              persistKey={`overview:${yearMonth}:income`}
              amount={summary.income}
              currency={settings.currency}
              goodWhen="up"
              className="text-lg font-semibold tracking-tight text-income md:text-xl"
            />
          }
          hint={
            <span className="tabular-nums">
              {quietDelta(summary.income, priorSummary.income)}
            </span>
          }
        />
        <StatTile
          label="Expenses"
          tone="expense"
          icon={<ArrowUpRight />}
          className="px-3 py-2.5 md:px-4 md:py-3"
          value={
            <Link
              to="/ledger"
              search={{ month: yearMonth }}
              className="inline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onMouseEnter={() => prefetchRoute(queryClient, '/ledger')}
            >
              <AnimatedMoney
                persistKey={`overview:${yearMonth}:expenses`}
                amount={summary.expenses}
                currency={settings.currency}
                goodWhen="down"
                className="text-lg font-semibold tracking-tight text-expense md:text-xl"
              />
            </Link>
          }
          hint={
            <span className="tabular-nums">
              {quietDelta(summary.expenses, priorSummary.expenses)}
            </span>
          }
        />
        <StatTile
          label="Budget left"
          icon={<Wallet />}
          className="px-3 py-2.5 md:px-4 md:py-3"
          value={
            <AnimatedMoney
              persistKey={`overview:${yearMonth}:remaining`}
              amount={remaining}
              currency={settings.currency}
              goodWhen="up"
              className="text-lg font-semibold tracking-tight md:text-xl"
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
          className="px-3 py-2.5 md:px-4 md:py-3"
          value={
            <AnimatedPercent
              persistKey={`overview:${yearMonth}:budget-used`}
              value={budgetUsed}
              goodWhen="down"
              className="text-lg font-semibold tracking-tight md:text-xl"
            />
          }
          hint={
            <Progress
              className="mt-1.5 hidden h-1.5 md:block"
              value={Math.min(budgetUsed * 100, 100)}
              aria-label="Budget used"
            />
          }
        />
      </section>

      <div className="shrink-0 md:hidden">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Budget used</span>
          <span className="tabular-nums">
            {Math.round(Math.min(budgetUsed * 100, 999))}%
          </span>
        </div>
        <Progress
          className="h-2"
          value={Math.min(budgetUsed * 100, 100)}
          aria-label="Budget used"
        />
      </div>

      <section className="grid gap-4 md:min-h-0 md:flex-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <Card className="flex min-w-0 flex-col gap-0 py-0 md:min-h-0">
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/ledger" search={{ month: yearMonth }}>
                  View all
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col px-0 pb-1 md:min-h-0 md:flex-1">
            {/* Phone: card rows */}
            <div className="px-3 py-2 md:hidden">
              {recentTransactions.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Receipt />}
                  title="No transactions yet"
                  description="Add an expense or income."
                  action={
                    <Button asChild size="sm">
                      <Link
                        to="/ledger"
                        search={{ new: true, month: yearMonth }}
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
              ) : (
                <MobileList>
                  {recentTransactions.map((transaction) => (
                    <MobileListRow
                      key={transaction.id}
                      title={transaction.description}
                      meta={`${transaction.category} · ${formatIsoDate(transaction.date)}`}
                      trailing={
                        <span className={amountToneClass(transaction.type)}>
                          {signedAmountPrefix(transaction.type)}
                          {money(transaction.amount, settings.currency)}
                        </span>
                      }
                      onClick={() => {
                        prefetchRoute(queryClient, '/ledger')
                        void navigate({
                          to: '/ledger',
                          search: {
                            month: yearMonth,
                            edit: transaction.id,
                          },
                        })
                      }}
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
                            <DropdownMenuItem asChild>
                              <Link
                                to="/ledger"
                                search={{
                                  month: yearMonth,
                                  edit: transaction.id,
                                }}
                              >
                                Edit in ledger
                              </Link>
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

            {/* Desktop: table */}
            <TableScroll className="hidden md:block">
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
                          description="Add an expense or income."
                          action={
                            <Button asChild size="sm">
                              <Link
                                to="/ledger"
                                search={{ new: true, month: yearMonth }}
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
                      <TableRow
                        key={transaction.id}
                        className="cursor-pointer"
                        onClick={() => {
                          prefetchRoute(queryClient, '/ledger')
                          void navigate({
                            to: '/ledger',
                            search: {
                              month: yearMonth,
                              edit: transaction.id,
                            },
                          })
                        }}
                      >
                        <TableCell className="font-medium">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {transaction.category}
                          </Badge>
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
                        <TableCell
                          onClick={(event) => event.stopPropagation()}
                        >
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
                                <Link
                                  to="/ledger"
                                  search={{
                                    month: yearMonth,
                                    edit: transaction.id,
                                  }}
                                >
                                  Edit in ledger
                                </Link>
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

        <div className="flex flex-col gap-4 md:scroll-panel md:min-h-0">
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
                  <Link
                    key={category.categoryId || category.name}
                    to="/ledger"
                    search={{
                      month: yearMonth,
                      ...(category.categoryId
                        ? { category: category.categoryId }
                        : {}),
                    }}
                    className="flex flex-col gap-1.5 rounded-md outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseEnter={() => prefetchRoute(queryClient, '/ledger')}
                  >
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
                  </Link>
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
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Manage recurring"
                >
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
                upcomingRecurring.map((item) => {
                  const status = dueStatus(item.nextDate)
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
                          <span className="truncate">{item.name}</span>
                          {status === 'overdue' ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : status === 'due' ? (
                            <Badge>Due</Badge>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Next {formatIsoDate(item.nextDate)}
                          {item.remainingAmount !== null
                            ? ` · ${money(amountDue(item), settings.currency)} left`
                            : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="pt-0.5 text-sm tabular-nums">
                          {money(amountDue(item), settings.currency)}
                        </span>
                        {canOneTapRecord(item.nextDate) ? (
                          <Button
                            size="xs"
                            className="active:scale-[0.97]"
                            disabled={recorder.recording}
                            onClick={() => recorder.recordOneTap(item)}
                          >
                            Record
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            className="active:scale-[0.97]"
                            disabled={recorder.recording}
                            onClick={() => recorder.openAdjust(item)}
                          >
                            Pay early
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <RecordRecurringControls
        recorder={recorder}
        paymentMethods={paymentMethods}
        currencyHint={settings.currency}
      />

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
        onConfirm={() => deleteMutation.mutate()}
      />

      <ResponsiveModal
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open)
          if (!open) {
            settingsMutation.reset()
            revertMonthMutation.reset()
          }
        }}
      >
        <ResponsiveModalContent className="sm:max-w-lg">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Budget & currency</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Set a default monthly budget, or a one-off amount for {monthLabel}
              . Percentages use this month’s budget.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <FieldGroup className="gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="display-currency">Currency</FieldLabel>
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
            </Field>
            <Field>
              <FieldLabel htmlFor="default-budget">
                Default monthly budget ({currencyDraft})
              </FieldLabel>
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
              <FieldDescription>
                Used every month unless you set a custom amount below.
              </FieldDescription>
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="month-budget">
                  This month’s budget · {monthLabel}
                </FieldLabel>
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
              <FieldDescription>
                {monthBudget.isCustom
                  ? `Custom for ${monthLabel}.`
                  : 'Matches your default until you change it.'}
              </FieldDescription>
            </Field>
            {settingsMutation.isError ? (
              <FieldError>{settingsMutation.error.message}</FieldError>
            ) : null}
            {revertMonthMutation.isError ? (
              <FieldError>{revertMonthMutation.error.message}</FieldError>
            ) : null}
            <BackupPanel />
          </FieldGroup>
          <ResponsiveModalFooter>
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
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </PageShell>
  )
}
