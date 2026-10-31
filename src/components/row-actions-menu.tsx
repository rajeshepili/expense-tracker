import type { ReactElement } from 'react'
import { MoreHorizontal, Copy } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from 'cn'

type RowActionsMenuProps = {
  label: string
  onDelete: () => void
  /** Plain edit action. Ignored when `editAsChild` is set. */
  onEdit?: () => void
  editLabel?: string
  /** e.g. `<Link to="…">Edit in ledger</Link>` */
  editAsChild?: ReactElement
  /** Optional duplicate action (e.g. pre-fill form with same values) */
  onDuplicate?: () => void
  /** `touch` = large hit target (mobile lists); `compact` = table rows */
  size?: 'touch' | 'compact'
}

export function RowActionsMenu({
  label,
  onDelete,
  onEdit,
  editLabel = 'Edit',
  editAsChild,
  onDuplicate,
  size = 'compact',
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'touch' ? 'icon' : 'icon-sm'}
          className={cn(size === 'touch' && 'min-h-11 min-w-11')}
          aria-label={`Actions for ${label}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editAsChild ? (
          <DropdownMenuItem asChild>{editAsChild}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        )}
        {onDuplicate ? (
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 size-4" aria-hidden />
            Duplicate
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
