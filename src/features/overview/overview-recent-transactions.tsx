import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { TransactionDetailSheet } from '#/features/ledger/transaction-detail-sheet'
import { SignedMoney } from '#/features/shared/signed-money'
import { useFlipList } from '#/hooks/use-flip-list'
import { formatIsoDate } from '#/lib/finance'
import { transferBadgeClass } from '#/lib/ledger-form'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'
import type { LedgerTransaction } from '#/lib/types'

function recentCategoryBadge(transaction: LedgerTransaction) {
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
  return <Badge variant="secondary">{transaction.category}</Badge>
}

type OverviewRecentTransactionsProps = {
  yearMonth: string
  currency: string
  transactions: LedgerTransaction[]
  onDelete: (transaction: LedgerTransaction) => void
}

export function OverviewRecentTransactions({
  yearMonth,
  currency,
  transactions,
  onDelete,
}: OverviewRecentTransactionsProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const listRef = useRef<HTMLElement | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailItem = useMemo(
    () =>
      detailId
        ? (transactions.find((row) => row.id === detailId) ?? null)
        : null,
    [detailId, transactions],
  )
  const { displayItems, isEntering, isExiting } = useFlipList(
    listRef,
    transactions,
    (row) => row.id,
  )

  function flipState(id: string): 'enter' | 'exit' | undefined {
    if (isExiting(id)) return 'exit'
    if (isEntering(id)) return 'enter'
    return undefined
  }

  function openEditInLedger(transaction: LedgerTransaction) {
    prefetchRoute(queryClient, '/ledger', { month: yearMonth })
    void navigateAfterPrefetch(router, queryClient, {
      to: '/ledger',
      search: { month: yearMonth, edit: transaction.id },
      month: yearMonth,
    })
  }

  const onLedgerLinkClick =
    (search: { month?: string; edit?: string; new?: boolean }) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      event.preventDefault()
      void navigateAfterPrefetch(router, queryClient, {
        to: '/ledger',
        search,
        month: search.month,
      })
    }

  const empty = (
    <EmptyState
      compact
      icon={<Receipt />}
      title="No transactions yet"
      description="Add an expense or income."
      action={
        <Button asChild size="sm">
          <Link
            to="/ledger"
            search={{ new: true, month: yearMonth }}
            onMouseEnter={() =>
              prefetchRoute(queryClient, '/ledger', { month: yearMonth })
            }
            onClick={onLedgerLinkClick({ new: true, month: yearMonth })}
          >
            <Plus data-icon="inline-start" />
            Add
          </Link>
        </Button>
      }
    />
  )

  return (
    <Card data-tour="recent" className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Recent transactions</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/ledger"
              search={{ month: yearMonth }}
              onClick={onLedgerLinkClick({ month: yearMonth })}
            >
              View all
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <VirtualizedDataList
          layout="flow"
          listRootRef={listRef}
          items={displayItems}
          getItemKey={(row) => row.id}
          mobileEstimateSize={72}
          desktopEstimateSize={56}
          colSpan={4}
          empty={empty}
          mobileClassName="px-4 py-3"
          header={
            <TableHeader>
              <TableRow>
                <TableHead className="h-10 px-4">Description</TableHead>
                <TableHead className="h-10 px-4">Category</TableHead>
                <TableHead className="h-10 px-4">Date</TableHead>
                <TableHead className="h-10 w-30 px-4 text-right whitespace-nowrap">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
          }
          renderMobile={(transaction, index) => {
            const state = flipState(transaction.id)
            return (
              <MobileListRow
                key={transaction.id}
                flip={{ key: transaction.id, state, index }}
                className="min-h-16 px-4 py-3.5"
                title={transaction.description}
                meta={`${
                  transaction.type === 'transfer'
                    ? transaction.transferDirection === 'in'
                      ? 'Transfer in'
                      : transaction.transferDirection === 'out'
                        ? 'Transfer out'
                        : 'Transfer'
                    : transaction.category
                } · ${formatIsoDate(transaction.date)}`}
                trailing={
                  <SignedMoney
                    type={transaction.type}
                    amount={transaction.amount}
                    currency={currency}
                    transferDirection={transaction.transferDirection}
                  />
                }
                onClick={
                  state === 'exit' ? undefined : () => setDetailId(transaction.id)
                }
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
                className="cursor-pointer pressable-row [@media(hover:hover)]:hover:bg-muted/40"
                onClick={
                  state === 'exit' ? undefined : () => setDetailId(transaction.id)
                }
              >
                <TableCell className="px-4 py-3.5 font-medium">
                  {transaction.description}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  {recentCategoryBadge(transaction)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-muted-foreground">
                  {formatIsoDate(transaction.date)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
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
      </CardContent>

      <TransactionDetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        currency={currency}
        onEdit={openEditInLedger}
        onDelete={onDelete}
      />
    </Card>
  )
}
