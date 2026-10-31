import { Plus } from 'lucide-react'
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
import { TableEmptyRow } from '#/components/layout/page-shell'
import { RowActionsMenu } from '#/components/row-actions-menu'
import type { CategoryRow } from '#/lib/types'

type CategoryListsProps = {
  rows: CategoryRow[]
  onCreate: () => void
  onEdit: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}

export function CategoryLists({
  rows,
  onCreate,
  onEdit,
  onDelete,
}: CategoryListsProps) {
  const empty = (
    <EmptyState
      title="No categories yet"
      description="Add a category to get started."
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
      items={rows}
      getItemKey={(row) => row.id}
      mobileEstimateSize={56}
      desktopEstimateSize={40}
      colSpan={5}
      empty={empty}
      desktopEmpty={<TableEmptyRow colSpan={5}>{empty}</TableEmptyRow>}
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
      renderMobile={(category) => (
        <MobileListRow
          key={category.id}
          title={category.name}
          meta={`${category.type} · ${category.transactionCount} txn${category.recurringCount ? ` · ${category.recurringCount} bills` : ''}`}
          onClick={() => onEdit(category)}
          actions={
            <RowActionsMenu
              label={category.name}
              size="touch"
              onEdit={() => onEdit(category)}
              onDelete={() => onDelete(category)}
            />
          }
        />
      )}
      renderDesktop={(category) => (
        <TableRow key={category.id}>
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
            <RowActionsMenu
              label={category.name}
              onEdit={() => onEdit(category)}
              onDelete={() => onDelete(category)}
            />
          </TableCell>
        </TableRow>
      )}
    />
  )
}
