import type { ReactNode } from 'react'
import { Target } from 'lucide-react'
import { Progress } from '#/components/ui/progress'
import { money, percent } from '#/lib/finance'
import {
  daysUntilTargetDate,
  formatDaysUntilLabel,
  savingsProgressPercent,
} from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'

/** Active-goal row: name, amounts, progress bar, optional target date. `actions` slot on the right. */
export function SavingsGoalCard({
  goal,
  currency,
  actions,
}: {
  goal: SavingsGoalRow
  currency: string
  actions?: ReactNode
}) {
  const progress = savingsProgressPercent(goal)
  const days = daysUntilTargetDate(goal.targetDate)
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{goal.name}</span>
            {goal.category ? (
              <span className="text-xs text-muted-foreground">{goal.category}</span>
            ) : null}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {money(goal.currentAmount, currency)} / {money(goal.targetAmount, currency)}
            </span>
            <span className="font-medium tabular-nums">{percent(progress / 100)}</span>
          </div>
          <Progress className="mt-2 h-1.5" value={progress} />
          {goal.targetDate && days !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Target: {goal.targetDate} · {formatDaysUntilLabel(days)}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  )
}

/** Compact completed-goal chip. */
export function CompletedGoalRow({
  goal,
  action,
}: {
  goal: SavingsGoalRow
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border bg-green-50/50 dark:bg-green-900/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-300">
            {goal.name}
          </span>
        </div>
        {action}
      </div>
    </div>
  )
}
