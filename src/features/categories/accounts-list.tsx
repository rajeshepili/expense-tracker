import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { Badge } from '#/components/ui/badge'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { money } from '#/lib/finance'
import type { AccountRow } from '#/lib/types'
import { cn } from 'cn'
import { typeLabel } from './account-form'

type AccountsListProps = {
  rows: AccountRow[]
  currency: string
  onOpenDetail: (row: AccountRow) => void
}

function accountMeta(row: AccountRow) {
  return (
    <>
      {typeLabel(row.type)}
      {' · '}
      {row.transactionCount > 0 ? (
        <Link
          to="/ledger"
          search={{ method: row.id }}
          className="underline-offset-2 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.transactionCount} transaction
          {row.transactionCount === 1 ? '' : 's'}
        </Link>
      ) : (
        <>0 transactions</>
      )}
      {row.recurringCount ? (
        <>
          {' '}
          · {row.recurringCount} bill
          {row.recurringCount === 1 ? '' : 's'}
        </>
      ) : null}
    </>
  )
}

export function AccountsList({
  rows,
  currency,
  onOpenDetail,
}: AccountsListProps) {
  const emptyAccounts = (
    <EmptyState
      compact
      icon={<Wallet />}
      title="No accounts yet"
      description="Add cash, cards, or bank accounts to track balances."
    />
  )

  return (
    <VirtualizedDataList
      layout="flow"
      items={rows}
      getItemKey={(row) => row.id}
      mobileEstimateSize={72}
      desktopEstimateSize={48}
      colSpan={4}
      empty={emptyAccounts}
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Activity</TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={(account) => (
        <MobileListRow
          key={account.id}
          title={
            <span className="inline-flex items-center gap-2">
              <span className={cn(account.closed && 'text-muted-foreground')}>
                {account.name}
              </span>
              {account.closed ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Closed
                </Badge>
              ) : null}
            </span>
          }
          meta={accountMeta(account)}
          trailing={
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                account.type === 'liability' || account.balance < 0
                  ? 'text-expense'
                  : undefined,
                account.closed && 'text-muted-foreground',
              )}
            >
              {money(account.balance, currency)}
            </span>
          }
          onClick={() => onOpenDetail(account)}
        />
      )}
      renderDesktop={(account) => (
        <TableRow
          key={account.id}
          className={cn(
            'cursor-pointer pressable-row [@media(hover:hover)]:hover:bg-muted/40',
            account.closed && 'opacity-70',
          )}
          onClick={() => onOpenDetail(account)}
        >
          <TableCell className="font-medium">
            <span className="inline-flex items-center gap-2">
              {account.name}
              {account.closed ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Closed
                </Badge>
              ) : null}
            </span>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {typeLabel(account.type)}
          </TableCell>
          <TableCell
            className={cn(
              'text-right tabular-nums font-medium',
              account.type === 'liability' || account.balance < 0
                ? 'text-expense'
                : undefined,
            )}
          >
            {money(account.balance, currency)}
          </TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">
            {account.transactionCount > 0 ? (
              <Link
                to="/ledger"
                search={{ method: account.id }}
                className="underline-offset-2 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {account.transactionCount}
              </Link>
            ) : (
              account.transactionCount
            )}
            {account.recurringCount
              ? ` · ${account.recurringCount} bill${account.recurringCount === 1 ? '' : 's'}`
              : null}
          </TableCell>
        </TableRow>
      )}
    />
  )
}
