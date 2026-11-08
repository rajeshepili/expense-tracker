import { Link } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { money, currentYearMonth } from '#/lib/finance'
import type { MonthProjection } from '#/lib/finance/projection'
import type { RecurringExpenseRow } from '#/lib/types'
import { cn } from 'cn'

type OverviewMonthOutlookProps = {
  yearMonth: string
  currency: string
  budget: number
  spent: number
  projectedRemaining: number
  projection: MonthProjection
  upcomingRecurring: RecurringExpenseRow[]
}

export function OverviewMonthOutlook({
  yearMonth,
  currency,
  budget,
  spent,
  projectedRemaining,
  projection,
  upcomingRecurring,
}: OverviewMonthOutlookProps) {
  const isCurrent = yearMonth === currentYearMonth()
  const scheduled = projection.upcomingExpenses
  const left = Math.max(0, budget - spent - scheduled)
  const spentPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
  const scheduledPct =
    budget > 0 ? Math.min(100 - spentPct, (scheduled / budget) * 100) : 0
  const leftPct = Math.max(0, 100 - spentPct - scheduledPct)

  if (!isCurrent) {
    return (
      <Card data-tour="month-outlook" className="shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            Month outlook
          </CardTitle>
          <CardDescription>
            Outlook is for the current month — switch back to see scheduled
            bills against your budget.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const hasRecurring =
    upcomingRecurring.length > 0 ||
    projection.upcomingIncome > 0 ||
    projection.upcomingExpenses > 0

  if (!hasRecurring) {
    return (
      <Card data-tour="month-outlook" className="shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-muted-foreground" />
            Month outlook
          </CardTitle>
          <CardDescription>
            Add recurring bills or income to see what you will likely have left
            at month end.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/recurring">Manage recurring</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const preview = upcomingRecurring.slice(0, 5)

  return (
    <Card data-tour="month-outlook" className="shrink-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-muted-foreground" />
          Month outlook
        </CardTitle>
        <CardDescription>
          Projected budget left after upcoming recurring activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted-foreground">At month end</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {money(projectedRemaining, currency)}
          </p>
        </div>

        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Spent ${spentPct.toFixed(0)} percent, scheduled ${scheduledPct.toFixed(0)} percent, remaining ${leftPct.toFixed(0)} percent of budget`}
        >
          <span
            className="bg-expense"
            style={{ width: `${spentPct}%`, opacity: 0.85 }}
            title="Spent so far"
          />
          <span
            className="bg-expense"
            style={{ width: `${scheduledPct}%`, opacity: 0.4 }}
            title="Scheduled expenses"
          />
          <span
            className="bg-primary"
            style={{ width: `${leftPct}%`, opacity: 0.3 }}
            title="Projected left"
          />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li>
            <span
              className="mr-1 inline-block size-2 rounded-sm bg-expense"
              style={{ opacity: 0.85 }}
            />
            Spent {money(spent, currency)}
          </li>
          <li>
            <span
              className="mr-1 inline-block size-2 rounded-sm bg-expense"
              style={{ opacity: 0.4 }}
            />
            Scheduled {money(scheduled, currency)}
          </li>
          <li>
            <span
              className="mr-1 inline-block size-2 rounded-sm bg-primary"
              style={{ opacity: 0.3 }}
            />
            Left ≈ {money(left, currency)}
          </li>
        </ul>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Upcoming income</dt>
            <dd className="font-medium tabular-nums text-income">
              +{money(projection.upcomingIncome, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Upcoming expenses</dt>
            <dd className="font-medium tabular-nums text-expense">
              −{money(projection.upcomingExpenses, currency)}
            </dd>
          </div>
        </dl>

        {preview.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {preview.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{row.name}</span>
                <span
                  className={cn(
                    'shrink-0 tabular-nums',
                    row.kind === 'income' ? 'text-income' : 'text-expense',
                  )}
                >
                  {row.kind === 'income' ? '+' : '−'}
                  {money(row.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/recurring">Manage recurring</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
