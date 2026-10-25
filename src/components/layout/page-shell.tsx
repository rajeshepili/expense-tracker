import type { ReactNode } from 'react'
import { cn } from 'cn'
import { ScrollArea } from '#/components/ui/scroll-area'

type PageShellProps = {
  children: ReactNode
  className?: string
  scroll?: 'none' | 'page'
}

export function PageShell({
  children,
  className,
  scroll = 'none',
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 p-4 md:gap-5 md:p-8',
        scroll === 'page' && 'scroll-panel overflow-y-auto md:overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TableScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ScrollArea className={cn('min-h-0 flex-1', className)}>
      {children}
    </ScrollArea>
  )
}
