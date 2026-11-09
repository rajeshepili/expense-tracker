import { Target } from 'lucide-react'
import { Progress } from '#/components/ui/progress'
import { formatIsoDate, money, percent } from '#/lib/finance'
import {
  daysUntilTargetDate,
  formatDaysUntilLabel,
  savingsProgressPercent,
} from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'
import { cn } from 'cn'

export function SavingsGoalCard({
  goal,
  currency,
  onOpen,
}: {
  goal: SavingsGoalRow
  currency: string
  onOpen: (goal: SavingsGoalRow) => void
}) {
  const progress = savingsProgressPercent(goal)
  const days = daysUntilTargetDate(goal.targetDate)
  return (
    <button
      type="button"
      onClick={() => onOpen(goal)}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left pressable',
        '[@media(hover:hover)]:hover:bg-muted/40',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{goal.name}</span>
        {goal.category ? (
          <span className="text-xs text-muted-foreground">{goal.category}</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {money(goal.currentAmount, currency)} /{' '}
          {money(goal.targetAmount, currency)}
        </span>
        <span className="font-medium tabular-nums">
          {percent(progress / 100)}
        </span>
      </div>
      <Progress className="mt-2 h-1.5" value={progress} />
      {goal.targetDate && days !== null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Target: {formatIsoDate(goal.targetDate)} · {formatDaysUntilLabel(days)}
        </p>
      ) : null}
    </button>
  )
}

export function CompletedGoalRow({
  goal,
  onOpen,
}: {
  goal: SavingsGoalRow
  onOpen: (goal: SavingsGoalRow) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(goal)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border bg-green-50/50 p-3 text-left pressable dark:bg-green-900/10',
        '[@media(hover:hover)]:hover:bg-green-50 dark:[@media(hover:hover)]:hover:bg-green-900/20',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Target className="size-4 shrink-0 text-green-600 dark:text-green-400" />
        <span className="truncate font-medium text-green-700 dark:text-green-300">
          {goal.name}
        </span>
      </div>
    </button>
  )
}
