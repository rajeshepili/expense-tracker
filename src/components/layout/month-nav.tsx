import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { currentYearMonth, formatYearMonth, shiftYearMonth } from '#/lib/finance'

type MonthNavProps = {
  /** undefined = current month, 'all' = all months, else YYYY-MM */
  monthFilter: string | undefined
  viewingMonth: string | null
  onGoMonth: (month: string) => void
}

export function MonthNav({ monthFilter, viewingMonth, onGoMonth }: MonthNavProps) {
  const isCurrentMonth = viewingMonth !== null && viewingMonth === currentYearMonth()
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-11 min-w-11 md:min-h-8 md:min-w-8 hover-lift"
          aria-label="Previous month"
          disabled={monthFilter === 'all'}
          onClick={() => onGoMonth(shiftYearMonth(viewingMonth ?? currentYearMonth(), -1))}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-[9.5rem] text-center font-medium text-foreground">
          {monthFilter === 'all'
            ? 'All months'
            : formatYearMonth(viewingMonth ?? currentYearMonth())}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-11 min-w-11 md:min-h-8 md:min-w-8 hover-lift"
          aria-label="Next month"
          disabled={monthFilter === 'all'}
          onClick={() => onGoMonth(shiftYearMonth(viewingMonth ?? currentYearMonth(), 1))}
        >
          <ChevronRight />
        </Button>
      </span>
      {monthFilter === 'all' || !isCurrentMonth ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onGoMonth(currentYearMonth())}
        >
          This month
        </Button>
      ) : null}
      {monthFilter !== 'all' ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onGoMonth('all')}
        >
          All months
        </Button>
      ) : null}
    </span>
  )
}
