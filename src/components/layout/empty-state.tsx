import type { ReactNode } from 'react'
import { cn } from 'cn'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        'border-0',
        compact ? 'gap-3 p-4 md:p-6' : 'gap-4 p-6 md:p-10',
        className,
      )}
    >
      <EmptyHeader className={compact ? 'gap-1.5' : undefined}>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle className={compact ? 'text-base' : undefined}>
          {title}
        </EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent className="gap-2">{action}</EmptyContent> : null}
    </Empty>
  )
}
