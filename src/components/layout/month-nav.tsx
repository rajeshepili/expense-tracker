import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import {
  currentYearMonth,
  formatYearMonth,
  shiftYearMonth,
} from '#/lib/finance'
import { cn } from 'cn'

type MonthNavProps = {
  /** undefined = current month, else YYYY-MM */
  monthFilter: string | undefined
  viewingMonth: string | null
  onGoMonth: (month: string) => void
  /** True while month data is refetching under placeholderData */
  fetching?: boolean
}

export function MonthNav({
  viewingMonth,
  onGoMonth,
  fetching = false,
}: MonthNavProps) {
  const activeMonth = viewingMonth ?? currentYearMonth()
  const isCurrentMonth = activeMonth === currentYearMonth()
  return (
    <span
      className="inline-flex flex-wrap items-center gap-2"
      aria-busy={fetching || undefined}
    >
      <span className="inline-flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-11 min-w-11 touch-manipulation md:min-h-8 md:min-w-8"
          aria-label="Previous month"
          disabled={fetching}
          onClick={() => onGoMonth(shiftYearMonth(activeMonth, -1))}
        >
          <ChevronLeft />
        </Button>
        <span
          className={cn(
            'inline-flex min-w-[9.5rem] items-center justify-center gap-1.5 font-medium text-foreground',
            fetching && 'text-muted-foreground',
          )}
        >
          {formatYearMonth(activeMonth)}
          {fetching ? (
            <Spinner className="size-3.5" aria-label="Loading month" />
          ) : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-11 min-w-11 touch-manipulation md:min-h-8 md:min-w-8"
          aria-label="Next month"
          disabled={fetching}
          onClick={() => onGoMonth(shiftYearMonth(activeMonth, 1))}
        >
          <ChevronRight />
        </Button>
      </span>
      {!isCurrentMonth ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation px-3 md:min-h-8 md:px-2.5 md:text-xs"
          onClick={() => onGoMonth(currentYearMonth())}
        >
          This month
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 touch-manipulation px-3 md:min-h-8 md:px-2.5 md:text-xs"
        onClick={() => {
          const year = activeMonth.slice(0, 4)
          window.location.assign(`/year?year=${year}`)
        }}
      >
        Year {String(activeMonth.slice(0, 4))}
      </Button>
    </span>
  )
}
