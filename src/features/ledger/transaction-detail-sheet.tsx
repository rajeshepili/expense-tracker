import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DetailSheet,
  DetailSheetFooter,
  closeDetailThen,
  detailSheetBtnClass,
} from '#/features/shared/detail-sheet'
import { SignedMoney } from '#/features/shared/signed-money'
import { useIsMobile } from '#/hooks/use-media-query'
import { formatIsoDate } from '#/lib/finance'
import { transferBadgeClass } from '#/lib/ledger-form'
import type { LedgerTransaction } from '#/lib/types'
import { cn } from 'cn'

type TransactionDetailSheetProps = {
  item: LedgerTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  onEdit: (item: LedgerTransaction) => void
  onDuplicate?: (item: LedgerTransaction) => void
  onDelete: (item: LedgerTransaction) => void
}

function typeLabel(tx: LedgerTransaction) {
  if (tx.type === 'transfer') {
    if (tx.transferDirection === 'in') return 'Transfer in'
    if (tx.transferDirection === 'out') return 'Transfer out'
    return 'Transfer'
  }
  return tx.type === 'income' ? 'Income' : 'Expense'
}

function typeBadge(tx: LedgerTransaction) {
  if (tx.type === 'transfer') {
    return (
      <Badge
        variant="outline"
        className={transferBadgeClass(tx.transferDirection)}
      >
        {typeLabel(tx)}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={
        tx.type === 'income'
          ? 'badge-income capitalize'
          : 'badge-expense capitalize'
      }
    >
      {tx.type}
    </Badge>
  )
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0 md:py-3">
      <dt className="shrink-0 text-xs text-muted-foreground md:text-sm">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium tracking-tight md:text-[0.9375rem]">
        {value}
      </dd>
    </div>
  )
}

export function TransactionDetailSheet({
  item,
  open,
  onOpenChange,
  currency,
  onEdit,
  onDuplicate,
  onDelete,
}: TransactionDetailSheetProps) {
  const isMobile = useIsMobile()
  const lastRef = useRef<LedgerTransaction | null>(null)
  if (item) lastRef.current = item
  const active = item ?? lastRef.current
  if (!active) return null

  const tx = active
  const account = tx.account ?? tx.paymentMethod
  const touchBtn = detailSheetBtnClass(isMobile)
  const destructiveBtn = detailSheetBtnClass(
    isMobile,
    'text-destructive hover:bg-destructive/10 hover:text-destructive',
  )

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <SignedMoney
            type={tx.type}
            amount={tx.amount}
            currency={currency}
            transferDirection={tx.transferDirection}
            className="text-2xl leading-none md:text-3xl tabular-nums"
          />
          <span className="mb-3 mt-4 flex min-w-0 items-center gap-2.5 pr-7">
            <span className="truncate leading-none">{tx.description}</span>
            <span className="inline-flex shrink-0 items-center">
              {typeBadge(tx)}
            </span>
          </span>
        </>
      }
      contentClassName="sm:max-w-md gap-0"
      footer={
        <DetailSheetFooter
          secondary={
            <>
              {onDuplicate ? (
                <Button
                  type="button"
                  variant="outline"
                  className={touchBtn}
                  onClick={() =>
                    closeDetailThen(onOpenChange, () => onDuplicate(tx))
                  }
                >
                  <Copy data-icon="inline-start" />
                  Duplicate
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={cn(destructiveBtn, !onDuplicate && 'col-span-2')}
                onClick={() =>
                  closeDetailThen(onOpenChange, () => onDelete(tx))
                }
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </>
          }
          primary={
            <Button
              type="button"
              className={touchBtn}
              onClick={() => closeDetailThen(onOpenChange, () => onEdit(tx))}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          }
        />
      }
    >

      <dl className="divide-y divide-border/60">
        <FactRow label="Date" value={formatIsoDate(tx.date, true)} />
        {tx.type !== 'transfer' ? (
          <FactRow label="Category" value={tx.category ?? '—'} />
        ) : null}
        <FactRow label="Account" value={account ?? '—'} />
      </dl>

      {tx.sourceRecurringId ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground md:text-sm">
          From a recurring bill.{' '}
          <Link
            to="/recurring"
            className="font-medium text-foreground underline-offset-2 hover:underline"
            onClick={() => onOpenChange(false)}
          >
            Open Bills
          </Link>
        </p>
      ) : null}
    </DetailSheet>
  )
}
