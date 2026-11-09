import { useRef } from 'react'
import type { ReactNode } from 'react'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { VirtualizedList } from '#/components/ui/virtualized-list'
import {
  MobileListFillShell,
  MobileListRow,
} from '#/components/layout/mobile-list'
import { Item, ItemContent, ItemTitle } from '#/components/ui/item'
import { SignedMoney } from '#/features/shared/signed-money'
import { formatIsoDate } from '#/lib/finance'
import { transactionMeta } from '#/lib/ledger-form'
import { useFlipList } from '#/hooks/use-flip-list'
import { useIsCompact, useIsMobile } from '#/hooks/use-media-query'
import { cn } from 'cn'
import type { LedgerTransaction } from '#/lib/types'

const TABLET_ROW_SIZE = 60
const DESKTOP_ROW_SIZE = 56

function isTempLedgerId(id: string) {
  return id.startsWith('temp-')
}

type LedgerListsProps = {
  rows: LedgerTransaction[]
  listMode: 'rows' | 'empty' | 'filtered'
  currency: string
  emptyLedger: ReactNode
  emptyFiltered: ReactNode
  onOpenDetail: (row: LedgerTransaction) => void
  onFilterByMethod: (methodId: string) => void
}

function LedgerAccountMeta({
  transaction,
  onFilterByMethod,
}: {
  transaction: LedgerTransaction
  onFilterByMethod: (methodId: string) => void
}) {
  const accountName = transaction.account ?? transaction.paymentMethod
  const accountId = transaction.accountId ?? transaction.paymentMethodId
  const lead =
    transaction.type === 'transfer' ? 'Transfer' : transaction.category

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      {lead ? <span className="truncate">{lead}</span> : null}
      {lead && accountName ? <span aria-hidden>·</span> : null}
      {accountName && accountId ? (
        <button
          type="button"
          className="truncate rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation()
            onFilterByMethod(accountId)
          }}
        >
          {accountName}
        </button>
      ) : accountName ? (
        <span className="truncate">{accountName}</span>
      ) : null}
    </span>
  )
}

function LedgerTabletRow({
  transaction,
  currency,
  onOpenDetail,
  onFilterByMethod,
}: {
  transaction: LedgerTransaction
  currency: string
  onOpenDetail: (row: LedgerTransaction) => void
  onFilterByMethod: (methodId: string) => void
}) {
  return (
    <Item
      variant="default"
      size="sm"
      className={cn(
        'min-h-14 touch-manipulation gap-3 rounded-none border-0 border-b border-border/60 last:border-b-0',
        'pressable-row cursor-pointer pressable [@media(hover:hover)]:hover:bg-muted/50',
      )}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(transaction)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetail(transaction)
        }
      }}
    >
      <ItemContent className="min-w-0 flex-1 gap-0.5">
        <ItemTitle className="max-w-full truncate">
          {transaction.description}
        </ItemTitle>
        <div className="line-clamp-1 text-xs text-muted-foreground">
          <LedgerAccountMeta
            transaction={transaction}
            onFilterByMethod={onFilterByMethod}
          />
        </div>
      </ItemContent>
      <div className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
        {formatIsoDate(transaction.date)}
      </div>
      <div className="shrink-0 text-right text-[0.95rem] font-medium tabular-nums">
        <SignedMoney
          type={transaction.type}
          amount={transaction.amount}
          currency={currency}
          transferDirection={transaction.transferDirection}
        />
      </div>
    </Item>
  )
}

export function LedgerLists({
  rows,
  listMode,
  currency,
  emptyLedger,
  emptyFiltered,
  onOpenDetail,
  onFilterByMethod,
}: LedgerListsProps) {
  const empty = listMode === 'empty' ? emptyLedger : emptyFiltered
  const listRef = useRef<HTMLElement | null>(null)

  const isMobile = useIsMobile()
  const isCompact = useIsCompact()
  const isTablet = isCompact && !isMobile
  const isDesktop = !isCompact

  // Compact: exit CSS only (no WAAPI / enter stagger).
  const { displayItems, isEntering, isExiting } = useFlipList(
    listRef,
    rows,
    (row) => row.id,
    {
      waapi: isDesktop,
      enters: isDesktop,
      isEphemeralKey: isTempLedgerId,
    },
  )

  const showEmpty = listMode !== 'rows' && displayItems.length === 0
  const items = showEmpty ? [] : displayItems

  function flipState(id: string): 'enter' | 'exit' | undefined {
    if (isExiting(id)) return 'exit'
    if (!isDesktop) return undefined
    if (isEntering(id)) return 'enter'
    return undefined
  }

  if (isMobile) {
    if (items.length === 0) {
      return <div className="min-h-0 flex-1">{empty}</div>
    }
    return (
      <MobileListFillShell listClassName="rounded-none border-0 bg-transparent">
        <VirtualizedList
          items={items}
          estimateSize={64}
          overscan={6}
          getItemKey={(row) => row.id}
        >
          {(transaction, index) => {
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
                  state === 'exit' ? undefined : () => onOpenDetail(transaction)
                }
              />
            )
          }}
        </VirtualizedList>
      </MobileListFillShell>
    )
  }

  if (isTablet) {
    if (items.length === 0) {
      return <div className="min-h-0 flex-1">{empty}</div>
    }
    return (
      <MobileListFillShell>
        <VirtualizedList
          items={items}
          estimateSize={TABLET_ROW_SIZE}
          overscan={6}
          getItemKey={(row) => row.id}
        >
          {(transaction) => (
            <LedgerTabletRow
              key={transaction.id}
              transaction={transaction}
              currency={currency}
              onOpenDetail={onOpenDetail}
              onFilterByMethod={onFilterByMethod}
            />
          )}
        </VirtualizedList>
      </MobileListFillShell>
    )
  }

  return (
    <VirtualizedDataList
      listRootRef={listRef}
      items={items}
      getItemKey={(row) => row.id}
      mobileEstimateSize={64}
      desktopEstimateSize={DESKTOP_ROW_SIZE}
      colSpan={3}
      empty={empty}
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="w-28">Date</TableHead>
            <TableHead className="w-32 text-right whitespace-nowrap">
              Amount
            </TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={() => null}
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
            className="pressable-row cursor-pointer [@media(hover:hover)]:hover:bg-muted/40"
            onClick={
              state === 'exit' ? undefined : () => onOpenDetail(transaction)
            }
          >
            <TableCell className="py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {transaction.description}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <LedgerAccountMeta
                    transaction={transaction}
                    onFilterByMethod={onFilterByMethod}
                  />
                </span>
              </div>
            </TableCell>
            <TableCell className="py-2.5 text-muted-foreground tabular-nums">
              {formatIsoDate(transaction.date)}
            </TableCell>
            <TableCell className="py-2.5 text-right whitespace-nowrap font-medium tabular-nums">
              <SignedMoney
                type={transaction.type}
                amount={transaction.amount}
                currency={currency}
                transferDirection={transaction.transferDirection}
              />
            </TableCell>
          </TableRow>
        )
      }}
    />
  )
}
