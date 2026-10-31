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
import { TableEmptyRow } from '#/components/layout/page-shell'
import { RowActionsMenu } from '#/components/row-actions-menu'
import { SignedMoney } from '#/components/signed-money'
import { formatIsoDate } from '#/lib/finance'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'
import type { LedgerTransaction } from '#/lib/types'

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

  function openInLedger(id: string) {
    prefetchRoute(queryClient, '/ledger', { month: yearMonth })
    void navigateAfterPrefetch(router, queryClient, {
      to: '/ledger',
      search: { month: yearMonth, edit: id },
      month: yearMonth,
    })
  }

  const onLedgerLinkClick =
    (search: { month?: string; edit?: string; new?: boolean }) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
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
            onMouseEnter={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
            onClick={onLedgerLinkClick({ new: true, month: yearMonth })}
          >
            <Plus data-icon="inline-start" />
            Add
          </Link>
        </Button>
      }
    />
  )

  const editLink = (id: string) => (
    <Link
      to="/ledger"
      search={{ month: yearMonth, edit: id }}
      onClick={onLedgerLinkClick({ month: yearMonth, edit: id })}
    >
      Edit in ledger
    </Link>
  )

  return (
    <Card data-tour="recent" className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b py-3">
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
      <CardContent className="px-0 pb-1">
        <VirtualizedDataList
          layout="flow"
          items={transactions}
          getItemKey={(row) => row.id}
          mobileEstimateSize={64}
          desktopEstimateSize={44}
          colSpan={5}
          empty={empty}
          desktopEmpty={<TableEmptyRow colSpan={5}>{empty}</TableEmptyRow>}
          mobileClassName="px-3 py-2"
          header={
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[7.5rem] text-right whitespace-nowrap">
                  Amount
                </TableHead>
                <TableHead className="w-10 pr-3">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
          }
          renderMobile={(transaction) => (
            <MobileListRow
              key={transaction.id}
              title={transaction.description}
              meta={`${transaction.category} · ${formatIsoDate(transaction.date)}`}
              trailing={
                <SignedMoney
                  type={transaction.type}
                  amount={transaction.amount}
                  currency={currency}
                />
              }
              onClick={() => openInLedger(transaction.id)}
              actions={
                <RowActionsMenu
                  label={transaction.description}
                  size="touch"
                  editAsChild={editLink(transaction.id)}
                  onDelete={() => onDelete(transaction)}
                />
              }
            />
          )}
          renderDesktop={(transaction) => (
            <TableRow
              key={transaction.id}
              className="cursor-pointer pressable-row"
              onClick={() => openInLedger(transaction.id)}
            >
              <TableCell className="font-medium">
                {transaction.description}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{transaction.category}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatIsoDate(transaction.date)}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                <SignedMoney
                  type={transaction.type}
                  amount={transaction.amount}
                  currency={currency}
                />
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <RowActionsMenu
                  label={transaction.description}
                  editAsChild={editLink(transaction.id)}
                  onDelete={() => onDelete(transaction)}
                />
              </TableCell>
            </TableRow>
          )}
        />
      </CardContent>
    </Card>
  )
}
