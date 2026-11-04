import { Link } from '@tanstack/react-router'
import { Repeat } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { DueStatusBadge } from '#/components/due-status-badge'
import { EmptyState } from '#/components/layout/empty-state'
import type { useRecordRecurring } from '#/hooks/use-record-recurring'
import { amountDue, canOneTapRecord, formatIsoDate, money } from '#/lib/finance'
import type { RecurringExpenseRow } from '#/lib/types'

type OverviewRecurringPanelProps = {
  currency: string
  recurringMonthly: number
  recurringOfBudget: number
  upcomingRecurring: RecurringExpenseRow[]
  recorder: ReturnType<typeof useRecordRecurring>
}

export function OverviewRecurringPanel({
  currency,
  recurringMonthly,
  recurringOfBudget,
  upcomingRecurring,
  recorder,
}: OverviewRecurringPanelProps) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base">Recurring</CardTitle>
        <CardDescription className="flex flex-wrap items-baseline gap-1.5">
          {money(recurringMonthly, currency)} / mo ·{' '}
          {recurringOfBudget * 100 >= 1
            ? `${(recurringOfBudget * 100).toFixed(1)}%`
            : '<1%'}
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
          <>
            {upcomingRecurring.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-md bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
                    <span className="truncate">{item.name}</span>
                    <DueStatusBadge nextDate={item.nextDate} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next {formatIsoDate(item.nextDate)}
                    {item.remainingAmount !== null
                      ? ` · ${money(amountDue(item), currency)} left`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col sm:flex-row sm:items-center gap-1.5">
                  <span className="pt-0.5 text-sm tabular-nums">
                    {money(amountDue(item), currency)}
                  </span>
                  {canOneTapRecord(item.nextDate) ? (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={recorder.recording}
                      onClick={() => recorder.recordOneTap(item)}
                    >
                      Record
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={recorder.recording}
                      onClick={() => recorder.openAdjust(item)}
                    >
                      Pay early
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}