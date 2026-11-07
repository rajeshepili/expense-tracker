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
  onDelete?: () => void
  deleteLabel?: string
  onEdit?: () => void
  editLabel?: string
  editAsChild?: ReactElement
  onDuplicate?: () => void
  onCloseAccount?: () => void
  onReopenAccount?: () => void
  size?: 'touch' | 'compact'
}

export function RowActionsMenu({
  label,
  onDelete,
  deleteLabel = 'Delete',
  onEdit,
  editLabel = 'Edit',
  editAsChild,
  onDuplicate,
  onCloseAccount,
  onReopenAccount,
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
        ) : onEdit ? (
          <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        ) : null}
        {onDuplicate ? (
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 size-4" aria-hidden />
            Duplicate
          </DropdownMenuItem>
        ) : null}
        {onCloseAccount ? (
          <DropdownMenuItem onClick={onCloseAccount}>Close</DropdownMenuItem>
        ) : null}
        {onReopenAccount ? (
          <DropdownMenuItem onClick={onReopenAccount}>Reopen</DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            {deleteLabel}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
