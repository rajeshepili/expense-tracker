import type { ReactNode } from 'react'
import { cn } from 'cn'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '#/components/ui/item'

export function MobileList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ItemGroup
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      {children}
    </ItemGroup>
  )
}

type MobileListRowProps = {
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  actions?: ReactNode
  className?: string
  onClick?: () => void
}

export function MobileListRow({
  title,
  meta,
  trailing,
  actions,
  className,
  onClick,
}: MobileListRowProps) {
  return (
    <Item
      variant="default"
      size="sm"
      className={cn(
        'min-h-14 touch-manipulation rounded-none border-0 border-b border-border last:border-b-0',
        'transition-[transform,background-color] duration-150 ease-out',
        onClick && 'cursor-pointer active:scale-[0.98] hover:bg-muted/50',
        className,
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="max-w-full truncate">{title}</ItemTitle>
        {meta ? (
          <ItemDescription className="line-clamp-1 text-xs">
            {meta}
          </ItemDescription>
        ) : null}
      </ItemContent>
      {trailing ? (
        <div className="shrink-0 text-right tabular-nums text-sm font-medium">
          {trailing}
        </div>
      ) : null}
      {actions ? (
        <ItemActions
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </ItemActions>
      ) : null}
    </Item>
  )
}
