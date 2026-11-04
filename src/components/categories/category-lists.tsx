import { useRef } from 'react'
import { Plus, Tags } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { RowActionsMenu } from '#/components/row-actions-menu'
import { useFlipList } from '#/hooks/use-flip-list'
import type { CategoryRow, CategoryType } from '#/lib/types'

type CategoryListsProps = {
  rows: CategoryRow[]
  filter?: 'all' | CategoryType
  totalCount?: number
  onCreate: () => void
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function CategoryLists({
  rows,
  filter = 'all',
  totalCount,
  onCreate,
  onEdit,
  onDelete,
}: CategoryListsProps) {
  const listRef = useRef<HTMLElement | null>(null)
  const { isEntering, isExiting } = useFlipList(listRef, rows, (row) => row.id)

  function flipState(id: string): 'enter' | 'exit' | undefined {
    if (isExiting(id)) return 'exit'
    if (isEntering(id)) return 'enter'
    return undefined
  }

  const filteredEmpty =
    filter !== 'all' && (totalCount ?? 0) > 0 && rows.length === 0

  const empty = (
    <EmptyState
      icon={<Tags />}
      title={
        filteredEmpty
          ? `No ${filter} categories`
          : 'No categories yet'
      }
      description={
        filteredEmpty
          ? `Switch to All, or add a new ${filter} category.`
          : 'Add a category to get started.'
      }
      action={
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      }
    />
  )

  return (
    <VirtualizedDataList
      layout="flow"
      listRootRef={listRef}
      items={rows}
      getItemKey={(row) => row.id}
      mobileEstimateSize={56}
      desktopEstimateSize={40}
      colSpan={5}
      empty={empty}
      mobileClassName="overflow-y-auto overscroll-contain"
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right whitespace-nowrap">
              Transactions
            </TableHead>
            <TableHead className="hidden text-right whitespace-nowrap sm:table-cell">
              Recurring
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={(category, index) => {
        const state = flipState(category.id)
        return (
          <MobileListRow
            key={category.id}
            flip={{ key: category.id, state, index }}
            title={category.name}
            meta={`${category.type} · ${category.transactionCount} txn${category.recurringCount ? ` · ${category.recurringCount} bills` : ''}`}
            onClick={state === 'exit' ? undefined : () => onEdit(category)}
            actions={
              state === 'exit' ? null : (
                <RowActionsMenu
                  label={category.name}
                  size="touch"
                  onEdit={() => onEdit(category)}
                  onDelete={() => onDelete(category)}
                />
              )
            }
          />
        )
      }}
      renderDesktop={(category, index) => {
        const state = flipState(category.id)
        return (
          <TableRow
            key={category.id}
            data-flip-key={category.id}
            data-flip-enter={state === 'enter' ? '' : undefined}
            data-flip-exit={state === 'exit' ? '' : undefined}
            style={
              state === 'enter'
                ? {
                    ['--flip-enter-delay' as string]: `${Math.min(index, 8) * 40}ms`,
                  }
                : undefined
            }
          >
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  category.type === 'income'
                    ? 'badge-income capitalize'
                    : 'badge-expense capitalize'
                }
              >
                {category.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">
              {category.transactionCount}
            </TableCell>
            <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
              {category.recurringCount}
            </TableCell>
            <TableCell>
              {state === 'exit' ? null : (
                <RowActionsMenu
                  label={category.name}
                  onEdit={() => onEdit(category)}
                  onDelete={() => onDelete(category)}
                />
              )}
            </TableCell>
          </TableRow>
        )
      }}
    />
  )
}
