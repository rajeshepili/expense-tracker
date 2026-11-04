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
import { useIsCompact } from '#/hooks/use-media-query'
import type { MonthBudget } from '#/lib/types'
import { cn } from 'cn'

type OverviewMonthStatsProps = {
  yearMonth: string
  currency: string
  summary: { income: number; expenses: number }
  priorSummary: { income: number; expenses: number }
  remaining: number
  budgetUsed: number
  monthBudget: MonthBudget
  projectedRemaining?: number
  projectionNet?: number
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
  ledgerType?: 'income' | 'expense'
}

export function OverviewMonthStats({
  yearMonth,
  currency,
  summary,
  priorSummary,
  remaining,
  budgetUsed,
  monthBudget,
  projectedRemaining,
  projectionNet,
}: OverviewMonthStatsProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const effectiveBudget = monthBudget.budget
  const isCompact = useIsCompact()

  const stats: StatConfig[] = [
    {
      label: 'Income',
      tone: 'income',
      icon: <ArrowDownLeft />,
      value: summary.income,
      delta: quietDelta(summary.income, priorSummary.income),
      goodWhen: 'up',
      link: true,
      ledgerType: 'income',
    },
    {
      label: 'Expenses',
      tone: 'expense',
      icon: <ArrowUpRight />,
      value: summary.expenses,
      delta: quietDelta(summary.expenses, priorSummary.expenses),
      goodWhen: 'down',
      link: true,
      ledgerType: 'expense',
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
          {projectedRemaining !== undefined ? (
            <span className="text-muted-foreground">
              · ≈ {money(projectedRemaining, currency)} at month end
              {projectionNet !== undefined && projectionNet !== 0
                ? ` (${projectionNet > 0 ? '+' : '−'}${money(Math.abs(projectionNet), currency)} upcoming)`
                : ''}
            </span>
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
        <div className="flex min-h-5 items-center">
          <Progress
            className="h-1.5 w-full"
            value={Math.min(budgetUsed * 100, 100)}
            aria-label="Budget used"
          />
        </div>
      ),
      goodWhen: 'down',
    },
  ]

  return (
    <section
      data-tour="stats"
      className={cn(
        'grid shrink-0 grid-cols-2 items-stretch gap-2',
        !isCompact && 'md:gap-3 xl:grid-cols-4',
      )}
      role="region"
      aria-label="Month summary"
    >
      {stats.map((stat, index) => {
        const tile = (
          <StatTile
            label={stat.label}
            tone={stat.tone}
            icon={stat.icon}
            linked={stat.link}
            className={cn(
              'h-full',
              isCompact
                ? 'rounded-xl px-3.5 py-3.5 shadow-sm pressable'
                : 'px-3 py-3 md:px-4 md:py-3.5',
            )}
            value={
              <span
                className={cn(
                  'font-semibold tracking-tight tabular-nums',
                  isCompact ? 'text-xl' : 'text-xl md:text-2xl',
                )}
              >
                {stat.isPercent ? `${stat.value.toFixed(1)}%` : money(stat.value, currency)}
              </span>
            }
            hint={stat.delta}
          />
        )
        return (
          <div
            key={stat.label}
            className="min-h-0 h-full"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {stat.link ? (
              <Link
                to="/ledger"
                search={{
                  month: yearMonth,
                  ...(stat.ledgerType ? { type: stat.ledgerType } : {}),
                }}
                aria-label={`${stat.label}: ${stat.isPercent ? `${stat.value.toFixed(1)}%` : money(stat.value, currency)} — open ledger`}
                className="block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseEnter={() =>
                  prefetchRoute(queryClient, '/ledger', { month: yearMonth })
                }
                onFocus={() =>
                  prefetchRoute(queryClient, '/ledger', { month: yearMonth })
                }
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return
                  event.preventDefault()
                  void navigateAfterPrefetch(router, queryClient, {
                    to: '/ledger',
                    search: {
                      month: yearMonth,
                      ...(stat.ledgerType ? { type: stat.ledgerType } : {}),
                    },
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
