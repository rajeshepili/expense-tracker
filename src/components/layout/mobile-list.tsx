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

export function MobileListFillShell({
  children,
  className,
  listClassName,
}: {
  children: ReactNode
  className?: string
  listClassName?: string
}) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <MobileList
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden p-0',
          listClassName,
        )}
      >
        {children}
      </MobileList>
    </div>
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
  flip,
}: MobileListRowProps & {
  flip?: { key: string; state?: 'enter' | 'exit'; index?: number }
}) {
  return (
    <Item
      variant="default"
      size="sm"
      data-flip-key={flip?.key}
      data-flip-enter={flip?.state === 'enter' ? '' : undefined}
      data-flip-exit={flip?.state === 'exit' ? '' : undefined}
      style={
        flip?.state === 'enter'
          ? {
              ['--flip-enter-delay' as string]: `${Math.min(flip.index ?? 0, 8) * 40}ms`,
            }
          : undefined
      }
      className={cn(
        'min-h-15 touch-manipulation rounded-none border-0 border-b border-border/60 last:border-b-0',
        'pressable-row',
        onClick &&
          'cursor-pointer pressable [@media(hover:hover)]:hover:bg-muted/50',
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
        <div className="shrink-0 text-right tabular-nums text-[0.95rem] font-medium">
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
