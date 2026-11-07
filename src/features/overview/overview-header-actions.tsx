import { Link, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { HardDrive, MoreHorizontal, Plus, Shield, Wallet } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Kbd } from '#/components/ui/kbd'
import { MARKETING_URL } from '#/lib/brand'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'

type OverviewHeaderActionsProps = {
  yearMonth: string
  onBackup: () => void
  onBudget: () => void
}

export function OverviewHeaderActions({
  yearMonth,
  onBackup,
  onBudget,
}: OverviewHeaderActionsProps) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return (
    <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 lg:hidden"
            aria-label="More overview actions"
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onSelect={onBackup}>
            <HardDrive aria-hidden />
            Backup
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onBudget}>
            <Wallet aria-hidden />
            Budget
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`${MARKETING_URL}/privacy`} rel="noopener" target="_blank">
              <Shield aria-hidden />
              Privacy
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:inline-flex"
        onClick={onBackup}
      >
        <HardDrive aria-hidden="true" data-icon="inline-start" />
        Backup
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:inline-flex"
        onClick={onBudget}
      >
        <Wallet aria-hidden="true" data-icon="inline-start" />
        Budget
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="hidden lg:inline-flex"
      >
        <a href={`${MARKETING_URL}/privacy`} rel="noopener" target="_blank">
          <Shield aria-hidden="true" data-icon="inline-start" />
          Privacy
        </a>
      </Button>
      <Button
        asChild
        size="sm"
        className="min-h-11 flex-1 sm:flex-none hover-lift"
        data-tour="add"
      >
        <Link
          to="/ledger"
          search={{ new: true, month: yearMonth }}
          onMouseEnter={() =>
            prefetchRoute(queryClient, '/ledger', { month: yearMonth })
          }
          onFocus={() =>
            prefetchRoute(queryClient, '/ledger', { month: yearMonth })
          }
          onClick={(event) => {
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
              search: { new: true, month: yearMonth },
              month: yearMonth,
            })
          }}
        >
          <Plus data-icon="inline-start" />
          Add
          <Kbd primary className="hidden sm:inline-flex">
            N
          </Kbd>
        </Link>
      </Button>
    </div>
  )
}
