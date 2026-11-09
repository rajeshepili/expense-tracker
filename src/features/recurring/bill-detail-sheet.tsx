import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Pause,
  Pencil,
  Play,
  Receipt,
  SkipForward,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { PanelScroll } from '#/components/ui/panel-scroll'
import {
  DetailSheet,
  DetailSheetFooter,
  closeDetailThen,
  detailSheetBtnClass,
} from '#/features/shared/detail-sheet'
import { DueStatusBadge } from '#/features/shared/due-status-badge'
import { SignedMoney } from '#/features/shared/signed-money'
import { EmptyState } from '#/components/layout/empty-state'
import { listTransactionsForRecurring } from '#/data/repository'
import { useIsMobile } from '#/hooks/use-media-query'
import type { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  amountDue,
  cadenceLabel,
  canOneTapRecord,
  formatIsoDate,
  money,
  monthlyEquivalent,
  percent,
} from '#/lib/finance'
import { queryKeys } from '#/lib/query/keys'
import type { LedgerTransaction, RecurringExpenseRow } from '#/lib/types'
import { cn } from 'cn'

function BillPaymentsList({
  payments,
  currency,
}: {
  payments: LedgerTransaction[]
  currency: string
}) {
  return (
    <PanelScroll className="max-h-48">
      <ul className="flex flex-col gap-1.5 pr-1">
        {payments.map((tx) => (
          <li
            key={tx.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tx.description}</p>
              <p className="text-xs text-muted-foreground">
                {tx.category} · {formatIsoDate(tx.date)}
              </p>
            </div>
            <SignedMoney type={tx.type} amount={tx.amount} currency={currency} />
          </li>
        ))}
      </ul>
    </PanelScroll>
  )
}

type BillDetailSheetProps = {
  item: RecurringExpenseRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  monthlyBudget: number
  recording: boolean
  togglePending: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  onToggle: (id: string, active: boolean) => void
  onEdit: (item: RecurringExpenseRow) => void
  onSkip: (item: RecurringExpenseRow) => void
  onDelete: (item: RecurringExpenseRow) => void
}

function billMeta(item: RecurringExpenseRow) {
  return [
    formatIsoDate(item.nextDate, true),
    cadenceLabel[item.cadence],
    item.category,
    item.paymentMethod || item.account || null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function BillDetailSheet({
  item,
  open,
  onOpenChange,
  currency,
  monthlyBudget,
  recording,
  togglePending,
  recorder,
  onToggle,
  onEdit,
  onSkip,
  onDelete,
}: BillDetailSheetProps) {
  const isMobile = useIsMobile()
  const lastItemRef = useRef<RecurringExpenseRow | null>(null)
  if (item) lastItemRef.current = item
  const activeBill = item ?? lastItemRef.current

  const paymentsQuery = useQuery({
    queryKey: activeBill
      ? queryKeys.recurringTransactions(activeBill.id)
      : ['recurring', 'transactions', 'none'],
    queryFn: () =>
      activeBill
        ? listTransactionsForRecurring(activeBill.id)
        : Promise.resolve([]),
    enabled: Boolean(activeBill) && open,
  })

  if (!activeBill) return null
  const bill: RecurringExpenseRow = activeBill
  const due = amountDue(bill)
  const oneTap = canOneTapRecord(bill.nextDate)
  const monthly = monthlyEquivalent(bill.amount, bill.cadence)
  const ofBudget =
    bill.kind === 'expense' && monthlyBudget > 0
      ? monthly / monthlyBudget
      : null
  const touchBtn = detailSheetBtnClass(isMobile)
  const destructiveBtn = detailSheetBtnClass(
    isMobile,
    'text-destructive hover:bg-destructive/10 hover:text-destructive',
  )
  const showAdjust = bill.active && oneTap
  const showSkip = bill.active
  const showPause = bill.active
  // Edit + Delete always; odd count → Delete spans full row.
  const secondaryCount =
    2 + (showAdjust ? 1 : 0) + (showSkip ? 1 : 0) + (showPause ? 1 : 0)
  const deleteSpans = secondaryCount % 2 === 1

  const primaryLabel = !bill.active
    ? 'Resume'
    : oneTap
      ? 'Record'
      : 'Pay early'

  function runPrimary() {
    if (!bill.active) {
      onToggle(bill.id, true)
      return
    }
    if (oneTap) recorder.recordOneTap(bill)
    else recorder.openAdjust(bill)
    onOpenChange(false)
  }

  const secondary = (
    <>
      {showAdjust ? (
        <Button
          type="button"
          variant="outline"
          className={touchBtn}
          disabled={recording}
          onClick={() => {
            recorder.openAdjust(bill)
            onOpenChange(false)
          }}
        >
          <SlidersHorizontal data-icon="inline-start" />
          Adjust…
        </Button>
      ) : null}
      {showSkip ? (
        <Button
          type="button"
          variant="outline"
          className={touchBtn}
          disabled={recording}
          onClick={() => closeDetailThen(onOpenChange, () => onSkip(bill))}
        >
          <SkipForward data-icon="inline-start" />
          Skip
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className={touchBtn}
        onClick={() => closeDetailThen(onOpenChange, () => onEdit(bill))}
      >
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      {showPause ? (
        <Button
          type="button"
          variant="outline"
          className={touchBtn}
          disabled={togglePending}
          onClick={() => onToggle(bill.id, false)}
        >
          <Pause data-icon="inline-start" />
          Pause
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className={cn(destructiveBtn, deleteSpans && 'col-span-2')}
        onClick={() => closeDetailThen(onOpenChange, () => onDelete(bill))}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </>
  )

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="truncate">{bill.name}</span>
          {bill.active ? (
            <DueStatusBadge nextDate={bill.nextDate} />
          ) : (
            <span className="text-xs font-normal text-muted-foreground">
              Paused
            </span>
          )}
        </span>
      }
      description={billMeta(bill)}
      footer={
        <DetailSheetFooter
          secondary={secondary}
          primary={
            <Button
              type="button"
              className={touchBtn}
              disabled={recording || (!bill.active && togglePending)}
              onClick={runPrimary}
            >
              {!bill.active ? (
                <Play data-icon="inline-start" />
              ) : null}
              {primaryLabel}
            </Button>
          }
        />
      }
    >
      <div className="space-y-1">
        <p
          className={cn(
            'text-3xl font-semibold tracking-tight tabular-nums',
            bill.kind === 'income' &&
              'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {bill.kind === 'income' ? '+' : ''}
          {money(due, currency)}
        </p>
        {bill.remainingAmount !== null ? (
          <p className="text-xs text-muted-foreground">
            {money(due, currency)} left of {money(bill.amount, currency)}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          'grid gap-2 rounded-xl border bg-muted/30 px-3 py-2.5',
          bill.kind === 'expense' ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <div>
          <p className="text-xs text-muted-foreground">Per month</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {money(monthly, currency)}
          </p>
        </div>
        {bill.kind === 'expense' ? (
          <div>
            <p className="text-xs text-muted-foreground">Of budget</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {ofBudget !== null ? percent(ofBudget) : '—'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Payments</h3>
        {paymentsQuery.isPending ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : paymentsQuery.isError ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {paymentsQuery.error instanceof Error
                ? paymentsQuery.error.message
                : 'Could not load payments.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void paymentsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : paymentsQuery.data?.length === 0 ? (
          <EmptyState
            compact
            icon={<Receipt />}
            title="No payments yet"
            description="Record a payment when this bill is due."
          />
        ) : (
          <BillPaymentsList
            payments={paymentsQuery.data ?? []}
            currency={currency}
          />
        )}
      </div>
    </DetailSheet>
  )
}
