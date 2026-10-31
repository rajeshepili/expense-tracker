import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { RowActionsMenu } from '#/components/row-actions-menu'
import { MobileListRow } from '#/components/layout/mobile-list'
import { TableEmptyRow } from '#/components/layout/page-shell'
import { SignedMoney } from '#/components/signed-money'
import { formatIsoDate } from '#/lib/finance'
import { transactionMeta } from '#/lib/ledger-form'
import { useFlipList } from '#/hooks/use-flip-list'
import type { LedgerTransaction } from '#/lib/types'

type LedgerListsProps = {
  rows: LedgerTransaction[]
  listMode: 'rows' | 'empty' | 'filtered'
  currency: string
  emptyLedger: ReactNode
  emptyFiltered: ReactNode
  onEdit: (row: LedgerTransaction) => void
  onDuplicate: (row: LedgerTransaction) => void
  onDelete: (row: LedgerTransaction) => void
  onFilterByMethod: (methodId: string) => void
}

export function LedgerLists({
  rows,
  listMode,
  currency,
  emptyLedger,
  emptyFiltered,
  onEdit,
  onDuplicate,
  onDelete,
  onFilterByMethod,
}: LedgerListsProps) {
  const empty = listMode === 'empty' ? emptyLedger : emptyFiltered
  const showEmpty = listMode !== 'rows'
  const listRef = useRef<HTMLDivElement>(null)
  const { isEntering } = useFlipList(
    listRef,
    showEmpty ? [] : rows,
    (row) => row.id,
  )

  function rowActions(
    transaction: LedgerTransaction,
    size?: 'touch',
  ) {
    return (
      <RowActionsMenu
        label={transaction.description}
        size={size}
        onEdit={() => onEdit(transaction)}
        onDuplicate={() => onDuplicate(transaction)}
        onDelete={() => onDelete(transaction)}
      />
    )
  }

  return (
    <div ref={listRef} className="contents">
    <VirtualizedDataList
      items={showEmpty ? [] : rows}
      getItemKey={(row) => row.id}
      mobileEstimateSize={64}
      desktopEstimateSize={44}
      colSpan={7}
      empty={empty}
      desktopEmpty={
        showEmpty ? <TableEmptyRow colSpan={7}>{empty}</TableEmptyRow> : undefined
      }
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden md:table-cell">Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={(transaction, index) => (
        <MobileListRow
          key={transaction.id}
          flip={{
            key: transaction.id,
            state: isEntering(transaction.id) ? 'enter' : undefined,
            index,
          }}
          title={transaction.description}
          meta={transactionMeta(transaction)}
          trailing={
            <SignedMoney
              type={transaction.type}
              amount={transaction.amount}
              currency={currency}
            />
          }
          onClick={() => onEdit(transaction)}
          actions={rowActions(transaction, 'touch')}
        />
      )}
      renderDesktop={(transaction, index) => (
        <TableRow
          key={transaction.id}
          data-flip-key={transaction.id}
          data-flip-enter={isEntering(transaction.id) ? '' : undefined}
          style={
            isEntering(transaction.id)
              ? { ['--flip-enter-delay' as string]: `${Math.min(index, 8) * 40}ms` }
              : undefined
          }
          className="pressable-row cursor-pointer"
          onClick={() => onEdit(transaction)}
        >
          <TableCell className="font-medium">{transaction.description}</TableCell>
          <TableCell>
            <Badge variant="secondary">{transaction.category}</Badge>
          </TableCell>
          <TableCell className="hidden text-muted-foreground md:table-cell">
            {transaction.paymentMethodId && transaction.paymentMethod ? (
              <button
                type="button"
                className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onFilterByMethod(transaction.paymentMethodId!)}
              >
                {transaction.paymentMethod}
              </button>
            ) : (
              '—'
            )}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {formatIsoDate(transaction.date)}
          </TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={
                transaction.type === 'income'
                  ? 'badge-income capitalize'
                  : 'badge-expense capitalize'
              }
            >
              {transaction.type}
            </Badge>
          </TableCell>
          <TableCell className="text-right whitespace-nowrap tabular-nums">
            <SignedMoney
              type={transaction.type}
              amount={transaction.amount}
              currency={currency}
            />
          </TableCell>
          <TableCell>{rowActions(transaction)}</TableCell>
        </TableRow>
      )}
    />
    </div>
  )
}
