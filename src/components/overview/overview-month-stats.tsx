import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartPie,
  Wallet,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Progress } from '#/components/ui/progress'
import { StatTile } from '#/components/stat-tile'
import { money } from '#/lib/finance'
import { quietDelta } from '#/lib/overview-helpers'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'
import { useIsMobile } from '#/hooks/use-media-query'
import type { MonthBudget } from '#/lib/types'

type OverviewMonthStatsProps = {
  yearMonth: string
  currency: string
  summary: { income: number; expenses: number }
  priorSummary: { income: number; expenses: number }
  remaining: number
  budgetUsed: number
  monthBudget: MonthBudget
}

interface StatConfig {
  label: string
  tone: 'default' | 'income' | 'expense'
  icon: React.ReactNode
  value: number
  delta: React.ReactNode
  goodWhen: 'up' | 'down'
  isPercent?: boolean
  link?: boolean
}

export function OverviewMonthStats({
  yearMonth,
  currency,
  summary,
  priorSummary,
  remaining,
  budgetUsed,
  monthBudget,
}: OverviewMonthStatsProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const effectiveBudget = monthBudget.budget
  const isMobile = useIsMobile()

  const stats: StatConfig[] = [
    {
      label: 'Income',
      tone: 'income',
      icon: <ArrowDownLeft />,
      value: summary.income,
      delta: quietDelta(summary.income, priorSummary.income),
      goodWhen: 'up',
      link: true,
    },
    {
      label: 'Expenses',
      tone: 'expense',
      icon: <ArrowUpRight />,
      value: summary.expenses,
      delta: quietDelta(summary.expenses, priorSummary.expenses),
      goodWhen: 'down',
      link: true,
    },
    {
      label: 'Budget left',
      tone: 'default',
      icon: <Wallet />,
      value: remaining,
      delta: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          of {money(effectiveBudget, currency)}
          {monthBudget.isCustom ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Custom</Badge>
          ) : null}
        </span>
      ),
      goodWhen: 'up',
    },
    {
      label: 'Budget used',
      tone: 'default',
      icon: <ChartPie />,
      value: budgetUsed * 100,
      isPercent: true,
      delta: (
        <Progress
          className="mt-1.5 h-1.5"
          value={Math.min(budgetUsed * 100, 100)}
          aria-label="Budget used"
        />
      ),
      goodWhen: 'down',
    },
  ]

  if (isMobile) {
    return (
      <section
        data-tour="stats"
        className="grid shrink-0 grid-cols-2 gap-2"
        role="region"
        aria-label="Month summary"
      >
        {stats.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            icon={stat.icon}
            className="rounded-xl px-3.5 py-3.5 shadow-sm"
            value={
              <span className="text-xl font-semibold tracking-tight tabular-nums">
                {stat.isPercent ? `${stat.value.toFixed(1)}%` : money(stat.value, currency)}
              </span>
            }
            hint={stat.delta}
          />
        ))}
      </section>
    )
  }

  return (
    <section data-tour="stats" className="grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4">
      {stats.map((stat, index) => {
        const tile = (
          <StatTile
            label={stat.label}
            tone={stat.tone}
            icon={stat.icon}
            linked={stat.link}
            className="px-3 py-3 md:px-4 md:py-3.5"
            value={
              <span className="text-xl font-semibold tracking-tight md:text-2xl tabular-nums">
                {stat.isPercent ? `${stat.value.toFixed(1)}%` : money(stat.value, currency)}
              </span>
            }
            hint={stat.delta}
          />
        )
        return (
          <div
            key={stat.label}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {stat.link ? (
              <Link
                to="/ledger"
                search={{ month: yearMonth }}
                aria-label={`${stat.label}: ${stat.isPercent ? `${stat.value.toFixed(1)}%` : money(stat.value, currency)} — open ledger`}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring [&_.stat-tile]:hover-lift"
                onMouseEnter={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
                onFocus={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
                onClick={(event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                  event.preventDefault()
                  void navigateAfterPrefetch(router, queryClient, {
                    to: '/ledger',
                    search: { month: yearMonth },
                    month: yearMonth,
                  })
                }}
              >
                {tile}
              </Link>
            ) : (
              tile
            )}
          </div>
        )
      })}
    </section>
  )
}