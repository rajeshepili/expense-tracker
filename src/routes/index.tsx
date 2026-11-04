import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { HardDrive, MoreHorizontal, Plus, Wallet } from 'lucide-react'
import { Kbd } from '#/components/ui/kbd'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { MonthNav } from '#/components/layout/month-nav'
import { PageHeader } from '#/components/layout/page-header'
import { PageError } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { BackupReminder, LocalDataCallout } from '#/components/local-data'
import { SavingsSummary } from '#/components/savings-summary'
import { RecordRecurringControls } from '#/components/record-recurring-controls'
import {
  deleteTransaction,
  getOverview,
  listPaymentMethods,
} from '#/data/repository'
import { useCreateHotkey } from '#/hooks/use-create-hotkey'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import { formatQueryError } from '#/lib/errors'
import {
  currentYearMonth,
  formatYearMonth,
  isYearMonth,
} from '#/lib/finance'
import { readCategoryView } from '#/lib/overview-helpers'
import type { CategoryView } from '#/lib/overview-helpers'
import { invalidateAfter } from '#/lib/query/invalidation'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'
import { queryKeys } from '#/lib/query/keys'
import { OverviewBodySkeleton } from '#/components/layout/page-skeletons'
import { OverviewMonthStats } from '#/components/overview/overview-month-stats'
import { OverviewRecentTransactions } from '#/components/overview/overview-recent-transactions'
import { OverviewCategoryBudget } from '#/components/overview/overview-category-budget'
import { OverviewRecurringPanel } from '#/components/overview/overview-recurring-panel'
import { OverviewAccountsPanel } from '#/components/overview/overview-accounts-panel'
import { BackupModal } from '#/components/backup-modal'
import { BudgetModal } from '#/components/budget-modal'
import type { LedgerTransaction } from '#/lib/types'
import { motion, resolveMonthDirection } from '#/lib/motion'


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

function Home() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const navigate = useNavigate()
  const { month: monthParam } = Route.useSearch()
  const yearMonth = monthParam ?? currentYearMonth()
  const recorder = useRecordRecurring()
  const [deleting, setDeleting] = useState<LedgerTransaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [categoryView, setCategoryView] =
    useState<CategoryView>(readCategoryView)
  const fetchOverview = async (month: string) => {
    const overview = await getOverview(month)
    queryClient.setQueryData(queryKeys.settings, overview.settings)
    return overview
  }
  const overviewQuery = useQuery({
    queryKey: queryKeys.overviewMonth(yearMonth),
    staleTime: 30_000,
    queryFn: () => fetchOverview(yearMonth),
    placeholderData: (prev) => prev,
  })
  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods,
    staleTime: 30_000,
    queryFn: listPaymentMethods,
    placeholderData: (prev) => prev,
  })

  function goMonth(next: string) {
    if (!motion.can('navigate')) return
    const direction = resolveMonthDirection(yearMonth, next)
    const prefetch = queryClient.prefetchQuery({
      queryKey: queryKeys.overviewMonth(next),
      queryFn: () => fetchOverview(next),
    })
    void motion.coalesceNavigate(`month:${next}`, async () => {
      await prefetch.catch(() => {})
      motion.month(
        () =>
          void navigate({
            to: '/',
            search: next === currentYearMonth() ? {} : { month: next },
          }),
        direction,
      )
    })
  }

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No transaction selected')
      await deleteTransaction(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'transactions',
        'categories',
        'accounts',
        'transfers',
      ])
      setDeleting(null)
    },
  })

  useCreateHotkey(() => {
    void navigateAfterPrefetch(router, queryClient, {
      to: '/ledger',
      search: { new: true, month: yearMonth },
      month: yearMonth,
    })
  }, settingsOpen || backupOpen || Boolean(deleting) || !motion.can('hotkey'))

  if (overviewQuery.isPending) {
    return (
      <PageShell scroll="page" aria-busy="true" aria-live="polite" aria-label="Loading overview…">
        <span className="sr-only">Loading overview…</span>
        <PageHeader
          title="Overview"
          description={
            <nav aria-label="Month navigation">
              <MonthNav
                monthFilter={monthParam}
                viewingMonth={yearMonth}
                onGoMonth={goMonth}
              />
            </nav>
          }
          actions={
            <div className="flex w-full gap-1.5 sm:w-auto sm:items-center">
              <Button size="sm" className="flex-1 sm:flex-none" disabled>
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </div>
          }
        />
        <OverviewBodySkeleton />
      </PageShell>
    )
  }

  if (overviewQuery.isError) {
    return (
      <PageError
        title="Could not load overview"
        message={formatQueryError(overviewQuery.error)}
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
    accounts: overviewAccounts,
    netWorth,
  } = overviewQuery.data
  const monthLabel = formatYearMonth(monthBudget.yearMonth)
  const paymentMethods = methodsQuery.data ?? []
  const monthFetching =
    overviewQuery.isFetching && !overviewQuery.isPending

  return (
    <PageShell scroll="page">
      <LocalDataCallout />
      <BackupReminder />
      <PageHeader
        title="Overview"
        description={
          <nav aria-label="Month navigation">
            <MonthNav
              monthFilter={monthParam}
              viewingMonth={yearMonth}
              onGoMonth={goMonth}
              fetching={monthFetching}
            />
          </nav>
        }
        actions={
          <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 min-w-11 lg:hidden"
                  aria-label="More overview actions"
                >
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onSelect={() => setBackupOpen(true)}>
                  <HardDrive aria-hidden />
                  Backup
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                  <Wallet aria-hidden />
                  Budget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => setBackupOpen(true)}
            >
              <HardDrive aria-hidden="true" data-icon="inline-start" />
              Backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => setSettingsOpen(true)}
            >
              <Wallet aria-hidden="true" data-icon="inline-start" />
              Budget
            </Button>
            <Button asChild size="sm" className="min-h-11 flex-1 sm:flex-none hover-lift" data-tour="add">
              <Link
                to="/ledger"
                search={{ new: true, month: yearMonth }}
                onMouseEnter={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
                onFocus={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
                onClick={(event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  void navigateAfterPrefetch(router, queryClient, {
                    to: '/ledger',
                    search: { new: true, month: yearMonth },
                    month: yearMonth,
                  })
                }}
              >
                <Plus data-icon="inline-start" />
                Add
                <Kbd primary className="hidden sm:inline-flex">N</Kbd>
              </Link>
            </Button>
          </div>
        }
      />

      <div
        className="month-view flex min-h-0 flex-col gap-4 md:gap-5"
        aria-busy={monthFetching || undefined}
      >
        <OverviewMonthStats
          yearMonth={yearMonth}
          currency={settings.currency}
          summary={summary}
          priorSummary={priorSummary}
          remaining={remaining}
          budgetUsed={budgetUsed}
          monthBudget={monthBudget}
        />

      <section className="grid shrink-0 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
            <OverviewRecentTransactions
              yearMonth={yearMonth}
              currency={settings.currency}
              transactions={recentTransactions}
              onDelete={(transaction) => {
                deleteMutation.reset()
                setDeleting(transaction)
              }}
            />
            <SavingsSummary />
          <OverviewAccountsPanel
            currency={settings.currency}
            accounts={overviewAccounts}
            netWorth={netWorth}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
            <OverviewCategoryBudget
              yearMonth={yearMonth}
              monthLabel={monthLabel}
              currency={settings.currency}
              budget={monthBudget.budget}
              categories={categories}
              categoryView={categoryView}
              onCategoryViewChange={setCategoryView}
            />
            <OverviewRecurringPanel
              currency={settings.currency}
              recurringMonthly={recurringMonthly}
              recurringOfBudget={recurringOfBudget}
              upcomingRecurring={upcomingRecurring}
              recorder={recorder}
            />
        </div>
      </section>

      {upcomingRecurring.length > 0 && (
        <RecordRecurringControls
          recorder={recorder}
          paymentMethods={paymentMethods}
          currencyHint={settings.currency}
        />
      )}
      </div>

      <BackupModal open={backupOpen} onOpenChange={setBackupOpen} />
      <BudgetModal open={settingsOpen} onOpenChange={setSettingsOpen} yearMonth={yearMonth} />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={
          deleting?.type === 'transfer'
            ? `Delete transfer “${deleting.description}”?`
            : `Delete “${deleting?.description ?? 'transaction'}”?`
        }
        description={
          deleting?.type === 'transfer'
            ? 'Both linked transfer legs will be removed. This cannot be undone.'
            : 'This transaction will be removed. This cannot be undone.'
        }
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />
    </PageShell>
  )
}