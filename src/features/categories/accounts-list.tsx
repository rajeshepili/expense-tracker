import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { RowActionsMenu } from '#/features/shared/row-actions-menu'
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
  onEdit: (row: AccountRow) => void
  onClose: (row: AccountRow) => void
  onReopen: (row: AccountRow) => void
  onDelete: (row: AccountRow) => void
}

function accountMeta(row: AccountRow) {
  return (
    <>
      {typeLabel(row.type)}
      {row.closed ? ' · Closed' : ''}
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

function accountActions(
  row: AccountRow,
  {
    onEdit,
    onClose,
    onReopen,
    onDelete,
  }: Pick<AccountsListProps, 'onEdit' | 'onClose' | 'onReopen' | 'onDelete'>,
) {
  const unused = row.transactionCount === 0 && row.recurringCount === 0
  return (
    <RowActionsMenu
      label={row.name}
      size="touch"
      onEdit={() => onEdit(row)}
      onCloseAccount={row.closed ? undefined : () => onClose(row)}
      onReopenAccount={row.closed ? () => onReopen(row) : undefined}
      onDelete={unused ? () => onDelete(row) : undefined}
    />
  )
}

export function AccountsList({
  rows,
  currency,
  onEdit,
  onClose,
  onReopen,
  onDelete,
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
      mobileEstimateSize={80}
      desktopEstimateSize={52}
      colSpan={5}
      mobileClassName="px-3 py-2"
      empty={emptyAccounts}
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Activity</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
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
          onClick={() => onEdit(account)}
          actions={accountActions(account, {
            onEdit,
            onClose,
            onReopen,
            onDelete,
          })}
        />
      )}
      renderDesktop={(account) => (
        <TableRow
          key={account.id}
          className={cn(account.closed && 'opacity-70')}
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
          <TableCell>
            <RowActionsMenu
              label={account.name}
              onEdit={() => onEdit(account)}
              onCloseAccount={
                account.closed ? undefined : () => onClose(account)
              }
              onReopenAccount={
                account.closed ? () => onReopen(account) : undefined
              }
              onDelete={
                account.transactionCount === 0 && account.recurringCount === 0
                  ? () => onDelete(account)
                  : undefined
              }
            />
          </TableCell>
        </TableRow>
      )}
    />
  )
}
