import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { StatTile } from '#/features/shared/stat-tile'
import { getSettings, getYearOverview } from '#/data/repository'
import { formatQueryError } from '#/lib/errors'
import { money } from '#/lib/finance'
import { queryKeys } from '#/lib/query/keys'
import { CategorySpendChart } from '#/features/overview/category-spend-chart'

export const Route = createFileRoute('/year')({
  validateSearch: (search: Record<string, unknown>) => {
    const year = typeof search.year === 'string' ? search.year : undefined
    return { year: year && /^\d{4}$/.test(year) ? year : String(new Date().getFullYear()) }
  },
  component: YearPage,
})

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function YearBarChart({
  months,
  currency,
}: {
  months: Array<{ yearMonth: string; income: number; expenses: number }>
  currency: string
}) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expenses)))
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-12 items-end gap-1 md:gap-1.5"
        role="img"
        aria-label="Monthly income and expenses bar chart"
        style={{ height: 160 }}
      >
        {months.map((m) => (
          <div key={m.yearMonth} className="flex h-full flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end gap-[2px]">
              <div
                className="w-1/2 rounded-t-sm bg-emerald-500/70"
                style={{ height: `${(m.income / max) * 100}%` }}
                title={`${MONTH_LABELS[Number(m.yearMonth.slice(5)) - 1]} income ${money(m.income, currency)}`}
              />
              <div
                className="w-1/2 rounded-t-sm bg-red-500/70"
                style={{ height: `${(m.expenses / max) * 100}%` }}
                title={`${MONTH_LABELS[Number(m.yearMonth.slice(5)) - 1]} expenses ${money(m.expenses, currency)}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1 md:gap-1.5">
        {months.map((m) => (
          <span
            key={m.yearMonth}
            className="text-center text-[9px] text-muted-foreground md:text-[10px]"
          >
            {MONTH_LABELS[Number(m.yearMonth.slice(5)) - 1]}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-500/70" aria-hidden /> Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-red-500/70" aria-hidden /> Expenses
        </span>
      </div>
    </div>
  )
}

function YearPage() {
  const { year } = Route.useSearch()
  const [yearState, setYearState] = useState(year)

  const yearQuery = useQuery({
    queryKey: queryKeys.overviewYear(yearState),
    queryFn: () => getYearOverview(yearState),
  })
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })

  if (yearQuery.isPending || settingsQuery.isPending) {
    return <PageLoading label={`Loading ${yearState}…`} variant="default" />
  }
  if (yearQuery.isError || settingsQuery.isError) {
    return (
      <PageError
        title={`Could not load ${yearState}`}
        message={formatQueryError(yearQuery.error ?? settingsQuery.error)}
        onRetry={() => void yearQuery.refetch()}
      />
    )
  }

  const data = yearQuery.data
  const currency = settingsQuery.data?.currency ?? 'USD'

  return (
    <PageShell scroll="page">
      <PageHeader
        title={`Year ${yearState}`}
        description="Your whole year at a glance — income, spending, and top categories."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
              aria-label="Previous year"
              onClick={() => setYearState(String(Number(yearState) - 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
              aria-label="Next year"
              disabled={Number(yearState) >= new Date().getFullYear()}
              onClick={() => setYearState(String(Number(yearState) + 1))}
            >
              <ChevronRight />
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-8">
              <Link to="/" search={{}}>Overview</Link>
            </Button>
          </div>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4" role="region" aria-label="Year summary">
        <StatTile label="Income" tone="income" value={<span className="text-xl font-semibold tabular-nums md:text-2xl">{money(data.totalIncome, currency)}</span>} />
        <StatTile label="Expenses" tone="expense" value={<span className="text-xl font-semibold tabular-nums md:text-2xl">{money(data.totalExpenses, currency)}</span>} />
        <StatTile
          label="Saved this year"
          value={<span className="text-xl font-semibold tabular-nums md:text-2xl">{money(data.totalIncome - data.totalExpenses, currency)}</span>}
        />
        <StatTile
          label="Toward goals"
          value={<span className="text-xl font-semibold tabular-nums md:text-2xl">{money(data.savingsSaved, currency)}</span>}
        />
      </section>

      <section className="flex flex-col rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold">Monthly flow</h2>
        <p className="mb-3 text-xs text-muted-foreground">Income vs expenses per month.</p>
        <YearBarChart months={data.months} currency={currency} />
      </section>

      <section className="flex flex-col rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold">Top categories</h2>
        <p className="mb-3 text-xs text-muted-foreground">Where the money went in {yearState}.</p>
        {data.topCategories.length > 0 ? (
          <CategorySpendChart
            categories={data.topCategories.map((c) => ({ name: c.name, amount: c.amount }))}
            budget={data.totalExpenses}
            currency={currency}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No expenses recorded in {yearState}.</p>
        )}
      </section>
    </PageShell>
  )
}
