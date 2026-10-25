import type { ReactNode } from 'react'
import { cn } from 'cn'

type PageShellProps = {
  children: ReactNode
  className?: string
}

/** Fills the app main area without scrolling the page. */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 p-6 md:gap-5 md:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Scrolls row content inside a fixed card; scrollbar is visually hidden. */
export function TableScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('scroll-panel min-h-0 flex-1', className)}>{children}</div>
  )
}
