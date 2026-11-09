import type { ReactNode } from 'react'
import { ChevronDown, Plus, Repeat } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { DueStatusBadge } from '#/features/shared/due-status-badge'
import { EmptyState } from '#/components/layout/empty-state'
import { Kbd } from '#/components/ui/kbd'
import type { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  amountDue,
  cadenceLabel,
  canOneTapRecord,
  formatIsoDate,
  money,
} from '#/lib/finance'
import type { RecurringExpenseRow } from '#/lib/types'
import { cn } from 'cn'

type RecurringListsProps = {
  thisMonth: RecurringExpenseRow[]
  later: RecurringExpenseRow[]
  paused: RecurringExpenseRow[]
  currency: string
  recording: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  onOpenDetail: (item: RecurringExpenseRow) => void
  onCreate: () => void
}

function billMeta(item: RecurringExpenseRow) {
  const parts = [
    item.category,
    cadenceLabel[item.cadence],
    item.paymentMethod || null,
  ].filter(Boolean)
  return parts.join(' · ')
}

function BillRow({
  item,
  currency,
  recording,
  recorder,
  onOpenDetail,
  showRecord,
}: {
  item: RecurringExpenseRow
  currency: string
  recording: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  onOpenDetail: (item: RecurringExpenseRow) => void
  showRecord: boolean
}) {
  const due = amountDue(item)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetail(item)
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-3.5 pressable',
        '[@media(hover:hover)]:hover:bg-muted/40',
        !item.active && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1 text-left">
        <p className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.name}</span>
          {item.active ? <DueStatusBadge nextDate={item.nextDate} /> : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.active
            ? `${formatIsoDate(item.nextDate, true)} · ${billMeta(item)}`
            : `Paused · ${billMeta(item)}`}
          {item.remainingAmount !== null
            ? ` · ${money(due, currency)} left`
            : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            'pr-0.5 text-right text-[0.95rem] font-medium tabular-nums',
            item.kind === 'income' && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {item.kind === 'income' ? '+' : ''}
          {money(due, currency)}
        </span>
        {showRecord ? (
          <Button
            size="sm"
            className="min-h-10 active:scale-[0.97]"
            disabled={recording}
            onClick={(event) => {
              event.stopPropagation()
              recorder.recordOneTap(item)
            }}
          >
            Record
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function BillSection({
  title,
  description,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  description?: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  if (count === 0) return null

  return (
    <Collapsible defaultOpen={defaultOpen} className="space-y-2">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex items-center gap-1.5 text-left"
            >
              <h2 className="text-sm font-medium tracking-tight">{title}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <CollapsibleContent className="space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}

export function RecurringLists({
  thisMonth,
  later,
  paused,
  currency,
  recording,
  recorder,
  onOpenDetail,
  onCreate,
}: RecurringListsProps) {
  const total = thisMonth.length + later.length + paused.length

  if (total === 0) {
    return (
      <EmptyState
        icon={<Repeat />}
        title="No recurring expenses"
        description={
          <>
            <p className="mb-2">Track rent, subscriptions, and other repeats.</p>
            <p className="text-xs text-muted-foreground">
              Tap <Kbd className="mx-1">N</Kbd> or the button below to create your
              first one.
            </p>
          </>
        }
        action={
          <Button size="sm" onClick={onCreate} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Recurring Expense
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {thisMonth.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center">
          <p className="text-sm font-medium">Nothing due this month</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Later bills are listed in the next section.
          </p>
        </div>
      ) : (
        <BillSection
          title="This month"
          description="Due soon, overdue, or still ahead in this cycle."
          count={thisMonth.length}
        >
          {thisMonth.map((item) => (
            <BillRow
              key={item.id}
              item={item}
              currency={currency}
              recording={recording}
              recorder={recorder}
              onOpenDetail={onOpenDetail}
              showRecord={canOneTapRecord(item.nextDate)}
            />
          ))}
        </BillSection>
      )}

      <BillSection
        title="Coming later"
        description="Hidden from this month. Open a bill to pay early."
        count={later.length}
        defaultOpen={thisMonth.length === 0}
      >
        {later.map((item) => (
          <BillRow
            key={item.id}
            item={item}
            currency={currency}
            recording={recording}
            recorder={recorder}
            onOpenDetail={onOpenDetail}
            showRecord={false}
          />
        ))}
      </BillSection>

      <BillSection title="Paused" count={paused.length} defaultOpen={false}>
        {paused.map((item) => (
          <BillRow
            key={item.id}
            item={item}
            currency={currency}
            recording={recording}
            recorder={recorder}
            onOpenDetail={onOpenDetail}
            showRecord={false}
          />
        ))}
      </BillSection>
    </div>
  )
}
