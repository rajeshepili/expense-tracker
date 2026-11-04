import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { SignedMoney } from '#/components/signed-money'
import { formatIsoDate } from '#/lib/finance'
import { transactionMeta, transferBadgeClass } from '#/lib/ledger-form'
import { useFlipList } from '#/hooks/use-flip-list'
import { useIsCompact } from '#/hooks/use-media-query'
import type { LedgerTransaction } from '#/lib/types'

const EXIT_HOLD_MS = 200

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

function typeBadge(transaction: LedgerTransaction) {
  if (transaction.type === 'transfer') {
    const label =
      transaction.transferDirection === 'in'
        ? 'Transfer in'
        : transaction.transferDirection === 'out'
          ? 'Transfer out'
          : 'Transfer'
    return (
      <Badge
        variant="outline"
        className={transferBadgeClass(transaction.transferDirection)}
      >
        {label}
      </Badge>
    )
  }
  return (
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
  )
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
  const listRef = useRef<HTMLElement | null>(null)
  const prevRowsRef = useRef(rows)
  const [exitingRows, setExitingRows] = useState<LedgerTransaction[]>([])

  useLayoutEffect(() => {
    const prev = prevRowsRef.current
    prevRowsRef.current = rows
    const liveIds = new Set(rows.map((row) => row.id))
    // Optimistic creates use temp-* ids then swap to real ids — don't exit-animate those.
    const removed = prev.filter(
      (row) => !liveIds.has(row.id) && !row.id.startsWith('temp-'),
    )
    if (removed.length === 0) {
      setExitingRows((current) =>
        current.some((row) => liveIds.has(row.id) || row.id.startsWith('temp-'))
          ? current.filter((row) => !liveIds.has(row.id) && !row.id.startsWith('temp-'))
          : current,
      )
      return
    }
    setExitingRows((current) => {
      const stillGone = current.filter(
        (row) => !liveIds.has(row.id) && !row.id.startsWith('temp-'),
      )
      const next = [...stillGone]
      for (const row of removed) {
        if (!next.some((item) => item.id === row.id)) next.push(row)
      }
      return next
    })
  }, [rows])

  useEffect(() => {
    if (exitingRows.length === 0) return
    const timer = window.setTimeout(() => setExitingRows([]), EXIT_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [exitingRows])

  const liveIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows])
  const displayRows = useMemo(() => {
    const extras = exitingRows.filter((row) => !liveIds.has(row.id))
    return extras.length === 0 ? rows : [...rows, ...extras]
  }, [rows, exitingRows, liveIds])

  const showEmpty = listMode !== 'rows' && displayRows.length === 0
  const isCompact = useIsCompact()
  // Virtualized mobile: no WAAPI / enter attrs (translateY fight). Desktop keeps FLIP.
  const { isEntering } = useFlipList(listRef, rows, (row) => row.id, {
    waapi: !isCompact,
    enters: !isCompact,
  })
  const exitingIds = useMemo(
    () => new Set(exitingRows.map((row) => row.id)),
    [exitingRows],
  )

  function flipState(id: string): 'enter' | 'exit' | undefined {
    if (isCompact) return undefined
    if (exitingIds.has(id)) return 'exit'
    if (isEntering(id)) return 'enter'
    return undefined
  }

  function rowActions(
    transaction: LedgerTransaction,
    size?: 'touch',
  ) {
    if (exitingIds.has(transaction.id)) return null
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
    <VirtualizedDataList
      listRootRef={listRef}
      items={showEmpty ? [] : displayRows}
      getItemKey={(row) => row.id}
      mobileEstimateSize={64}
      desktopEstimateSize={44}
      colSpan={7}
      empty={empty}
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden md:table-cell">Account</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={(transaction, index) => {
        const state = flipState(transaction.id)
        return (
          <MobileListRow
            key={transaction.id}
            flip={{
              key: transaction.id,
              state,
              index,
            }}
            title={transaction.description}
            meta={transactionMeta(transaction)}
            trailing={
              <SignedMoney
                type={transaction.type}
                amount={transaction.amount}
                currency={currency}
                transferDirection={transaction.transferDirection}
              />
            }
            onClick={
              state === 'exit' ? undefined : () => onEdit(transaction)
            }
            actions={rowActions(transaction, 'touch')}
          />
        )
      }}
      renderDesktop={(transaction, index) => {
        const state = flipState(transaction.id)
        return (
          <TableRow
            key={transaction.id}
            data-flip-key={transaction.id}
            data-flip-enter={state === 'enter' ? '' : undefined}
            data-flip-exit={state === 'exit' ? '' : undefined}
            style={
              state === 'enter'
                ? {
                    ['--flip-enter-delay' as string]: `${Math.min(index, 8) * 40}ms`,
                  }
                : undefined
            }
            className="pressable-row cursor-pointer"
            onClick={
              state === 'exit' ? undefined : () => onEdit(transaction)
            }
          >
            <TableCell className="font-medium">
              {transaction.description}
            </TableCell>
            <TableCell>
              {transaction.type === 'transfer' ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <Badge variant="secondary">{transaction.category}</Badge>
              )}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {(transaction.accountId || transaction.paymentMethodId) &&
              (transaction.account || transaction.paymentMethod) ? (
                <button
                  type="button"
                  className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(event) => {
                    event.stopPropagation()
                    onFilterByMethod(
                      transaction.accountId ?? transaction.paymentMethodId!,
                    )
                  }}
                >
                  {transaction.account ?? transaction.paymentMethod}
                </button>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatIsoDate(transaction.date)}
            </TableCell>
            <TableCell>{typeBadge(transaction)}</TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">
              <SignedMoney
                type={transaction.type}
                amount={transaction.amount}
                currency={currency}
                transferDirection={transaction.transferDirection}
              />
            </TableCell>
            <TableCell onClick={(event) => event.stopPropagation()}>
              {rowActions(transaction)}
            </TableCell>
          </TableRow>
        )
      }}
    />
  )
}
