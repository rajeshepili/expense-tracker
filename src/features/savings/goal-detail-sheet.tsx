import { useRef } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import {
  DetailSheet,
  DetailSheetFooter,
  closeDetailThen,
  detailSheetBtnClass,
} from '#/features/shared/detail-sheet'
import { useIsMobile } from '#/hooks/use-media-query'
import { formatIsoDate, money, percent } from '#/lib/finance'
import {
  daysUntilTargetDate,
  formatDaysUntilLabel,
  savingsProgressPercent,
} from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'
import { cn } from 'cn'

type GoalDetailSheetProps = {
  item: SavingsGoalRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  completed?: boolean
  onContribute?: (item: SavingsGoalRow) => void
  onEdit: (item: SavingsGoalRow) => void
  onDelete: (item: SavingsGoalRow) => void
}

export function GoalDetailSheet({
  item,
  open,
  onOpenChange,
  currency,
  completed = false,
  onContribute,
  onEdit,
  onDelete,
}: GoalDetailSheetProps) {
  const isMobile = useIsMobile()
  const lastRef = useRef<SavingsGoalRow | null>(null)
  if (item) lastRef.current = item
  const active = item ?? lastRef.current
  if (!active) return null

  const goal = active
  const progress = savingsProgressPercent(goal)
  const days = daysUntilTargetDate(goal.targetDate)
  const canContribute = Boolean(onContribute) && !completed
  const touchBtn = detailSheetBtnClass(isMobile)
  const destructiveBtn = detailSheetBtnClass(
    isMobile,
    'text-destructive hover:bg-destructive/10 hover:text-destructive',
  )

  const secondary = canContribute ? (
    <>
      <Button
        type="button"
        variant="outline"
        className={touchBtn}
        onClick={() => closeDetailThen(onOpenChange, () => onEdit(goal))}
      >
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        className={destructiveBtn}
        onClick={() => closeDetailThen(onOpenChange, () => onDelete(goal))}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </>
  ) : (
    <Button
      type="button"
      variant="outline"
      className={cn(destructiveBtn, 'col-span-2')}
      onClick={() => closeDetailThen(onOpenChange, () => onDelete(goal))}
    >
      <Trash2 data-icon="inline-start" />
      Delete
    </Button>
  )

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal.name}
      description={
        goal.category
          ? `Linked to ${goal.category}`
          : completed
            ? 'Completed'
            : 'Savings goal'
      }
      footer={
        <DetailSheetFooter
          secondary={secondary}
          primary={
            canContribute ? (
              <Button
                type="button"
                className={touchBtn}
                onClick={() =>
                  closeDetailThen(onOpenChange, () => onContribute?.(goal))
                }
              >
                <Plus data-icon="inline-start" />
                Add progress
              </Button>
            ) : (
              <Button
                type="button"
                className={touchBtn}
                onClick={() => closeDetailThen(onOpenChange, () => onEdit(goal))}
              >
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
            )
          }
        />
      }
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {money(goal.currentAmount, currency)}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            of {money(goal.targetAmount, currency)}
          </p>
        </div>
        <Progress className="h-1.5" value={progress} />
        <p className="text-sm font-medium tabular-nums">
          {percent(progress / 100)}
        </p>
      </div>

      {goal.targetDate ? (
        <p className="text-sm text-muted-foreground">
          Target {formatIsoDate(goal.targetDate, true)}
          {days !== null ? ` · ${formatDaysUntilLabel(days)}` : ''}
        </p>
      ) : null}
    </DetailSheet>
  )
}
