import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Ban, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DetailSheet,
  DetailSheetFooter,
  closeDetailThen,
  detailSheetBtnClass,
} from '#/features/shared/detail-sheet'
import { useIsMobile } from '#/hooks/use-media-query'
import { money } from '#/lib/finance'
import type { AccountRow } from '#/lib/types'
import { cn } from 'cn'
import { typeLabel } from './account-form'

type AccountDetailSheetProps = {
  item: AccountRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  onEdit: (item: AccountRow) => void
  onClose: (item: AccountRow) => void
  onReopen: (item: AccountRow) => void
  onDelete: (item: AccountRow) => void
}

export function AccountDetailSheet({
  item,
  open,
  onOpenChange,
  currency,
  onEdit,
  onClose,
  onReopen,
  onDelete,
}: AccountDetailSheetProps) {
  const isMobile = useIsMobile()
  const lastRef = useRef<AccountRow | null>(null)
  if (item) lastRef.current = item
  const active = item ?? lastRef.current
  if (!active) return null

  const account = active
  const unused =
    account.transactionCount === 0 && account.recurringCount === 0
  const touchBtn = detailSheetBtnClass(isMobile)
  const destructiveBtn = detailSheetBtnClass(
    isMobile,
    'text-destructive hover:bg-destructive/10 hover:text-destructive',
  )

  function runPrimary() {
    if (account.closed) {
      onReopen(account)
      onOpenChange(false)
      return
    }
    closeDetailThen(onOpenChange, () => onEdit(account))
  }

  const secondary = (
    <>
      {!account.closed ? (
        <Button
          type="button"
          variant="outline"
          className={cn(touchBtn, unused ? undefined : 'col-span-2')}
          onClick={() => closeDetailThen(onOpenChange, () => onClose(account))}
        >
          <Ban data-icon="inline-start" />
          Close account
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(touchBtn, unused ? undefined : 'col-span-2')}
          onClick={() => closeDetailThen(onOpenChange, () => onEdit(account))}
        >
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      )}
      {unused ? (
        <Button
          type="button"
          variant="outline"
          className={destructiveBtn}
          onClick={() =>
            closeDetailThen(onOpenChange, () => onDelete(account))
          }
        >
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      ) : null}
    </>
  )

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="truncate">{account.name}</span>
          {account.closed ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Closed
            </Badge>
          ) : null}
        </span>
      }
      footer={
        <DetailSheetFooter
          secondary={secondary}
          primary={
            <Button type="button" className={touchBtn} onClick={runPrimary}>
              {account.closed ? (
                <RotateCcw data-icon="inline-start" />
              ) : (
                <Pencil data-icon="inline-start" />
              )}
              {account.closed ? 'Reopen' : 'Edit'}
            </Button>
          }
        />
      }
    >
      <p
        className={cn(
          'text-3xl font-semibold tracking-tight tabular-nums',
          account.type === 'liability' || account.balance < 0
            ? 'text-expense'
            : undefined,
        )}
      >
        {money(account.balance, currency)}
      </p>

      <dl className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Type</dt>
          <dd className="mt-0.5 font-medium">{typeLabel(account.type)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Starting</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {money(account.startingBalance, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Transactions</dt>
          <dd className="mt-0.5 font-medium">
            {account.transactionCount > 0 ? (
              <Link
                to="/ledger"
                search={{ method: account.id }}
                className="underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {account.transactionCount}
              </Link>
            ) : (
              '0'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bills</dt>
          <dd className="mt-0.5 font-medium">{account.recurringCount}</dd>
        </div>
      </dl>
    </DetailSheet>
  )
}
