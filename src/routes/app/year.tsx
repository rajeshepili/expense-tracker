import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
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
    return {
      year:
        year && /^\d{4}$/.test(year) ? year : String(new Date().getFullYear()),
    }
  },
  component: YearPage,
})

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const monthlyFlowConfig = {
  income: {
    label: 'Income',
    color: 'var(--income)',
  },
  expenses: {
    label: 'Expenses',
    color: 'var(--expense)',
  },
} satisfies ChartConfig

const compactAxis = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function YearBarChart({
  months,
  currency,
}: {
  months: Array<{ yearMonth: string; income: number; expenses: number }>
  currency: string
}) {
  const chartData = useMemo(
    () =>
      months.map((m) => ({
        month: MONTH_LABELS[Number(m.yearMonth.slice(5)) - 1] ?? m.yearMonth,
        income: m.income,
        expenses: m.expenses,
      })),
    [months],
  )

  return (
    <ChartContainer
      config={monthlyFlowConfig}
      className="aspect-auto h-60 w-full"
    >
      <BarChart accessibilityLayer data={chartData} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickMargin={4}
          tickFormatter={(value) => compactAxis.format(Number(value))}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <>
                  <div
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                    <span className="text-muted-foreground">
                      {monthlyFlowConfig[
                        name as keyof typeof monthlyFlowConfig
                      ]?.label ?? name}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {money(Number(value), currency)}
                    </span>
                  </div>
                </>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="income"
          fill="var(--color-income)"
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="expenses"
          fill="var(--color-expenses)"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
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
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-8"
            >
              <Link to="/" search={{}}>
                Overview
              </Link>
            </Button>
          </div>
        }
      />

      <section
        className="grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4"
        role="region"
        aria-label="Year summary"
      >
        <StatTile
          label="Income"
          tone="income"
          value={
            <span className="text-xl font-semibold tabular-nums md:text-2xl">
              {money(data.totalIncome, currency)}
            </span>
          }
        />
        <StatTile
          label="Expenses"
          tone="expense"
          value={
            <span className="text-xl font-semibold tabular-nums md:text-2xl">
              {money(data.totalExpenses, currency)}
            </span>
          }
        />
        <StatTile
          label="Saved this year"
          value={
            <span className="text-xl font-semibold tabular-nums md:text-2xl">
              {money(data.totalIncome - data.totalExpenses, currency)}
            </span>
          }
        />
        <StatTile
          label="Toward goals"
          value={
            <span className="text-xl font-semibold tabular-nums md:text-2xl">
              {money(data.savingsSaved, currency)}
            </span>
          }
        />
      </section>

      <section className="flex flex-col rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold">Monthly flow</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Income vs expenses per month.
        </p>
        <YearBarChart months={data.months} currency={currency} />
      </section>

      <section className="flex flex-col rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold">Top categories</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Where the money went in {yearState}.
        </p>
        {data.topCategories.length > 0 ? (
          <CategorySpendChart
            categories={data.topCategories.map((c) => ({
              name: c.name,
              amount: c.amount,
            }))}
            budget={data.totalExpenses}
            currency={currency}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No expenses recorded in {yearState}.
          </p>
        )}
      </section>
    </PageShell>
  )
}
