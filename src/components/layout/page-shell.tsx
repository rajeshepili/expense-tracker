import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from 'cn'

type PageShellProps = {
  children: ReactNode
  className?: string
  scroll?: 'none' | 'page'
} & ComponentPropsWithoutRef<'div'>

/** `scroll="page"`: padding on inner stack so bottom space extends scrollHeight. */
export function PageShell({
  children,
  className,
  scroll = 'none',
  ...props
}: PageShellProps) {
  if (scroll === 'page') {
    return (
      <div
        className={cn('scroll-panel h-full min-h-0 w-full', className)}
        {...props}
      >
        <div
          data-page-stack
          className="mx-auto flex w-full flex-col gap-4 p-4 pb-16 md:gap-5 md:px-8 md:pt-8 md:pb-24"
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full flex-col gap-4 p-4 md:gap-5 md:p-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
