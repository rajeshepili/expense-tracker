import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { EmptyState } from '#/components/layout/empty-state'
import { money } from '#/lib/finance'
import { prefetchRoute } from '#/lib/query/prefetch'
import type { AccountType } from '#/lib/types'
import { cn } from 'cn'

export type OverviewAccount = {
  id: string
  name: string
  type: AccountType
  balance: number
}

type OverviewAccountsPanelProps = {
  currency: string
  accounts: OverviewAccount[]
  netWorth: number
}

function typeLabel(type: AccountType) {
  return type === 'liability' ? 'Liability' : 'Asset'
}

export function OverviewAccountsPanel({
  currency,
  accounts,
  netWorth,
}: OverviewAccountsPanelProps) {
  const queryClient = useQueryClient()
  const prefetchCategories = () => prefetchRoute(queryClient, '/categories')

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base">Accounts</CardTitle>
        <CardDescription>
          Net worth{' '}
          <span className="font-medium tabular-nums text-foreground">
            {money(netWorth, currency)}
          </span>
        </CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <Link
              to="/categories"
              onMouseEnter={prefetchCategories}
              onFocus={prefetchCategories}
            >
              Open Categories
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {accounts.length === 0 ? (
          <EmptyState
            compact
            icon={<Wallet />}
            title="No open accounts"
            description="Add cash, cards, or bank accounts on Categories."
            action={
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link
                  to="/categories"
                  onMouseEnter={prefetchCategories}
                  onFocus={prefetchCategories}
                >
                  Add account
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  to="/ledger"
                  search={{ method: account.id }}
                  className="pressable-row flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => prefetchRoute(queryClient, '/ledger')}
                  onFocus={() => prefetchRoute(queryClient, '/ledger')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {account.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(account.type)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      account.type === 'liability' || account.balance < 0
                        ? 'text-expense'
                        : 'text-foreground',
                    )}
                  >
                    {money(account.balance, currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
