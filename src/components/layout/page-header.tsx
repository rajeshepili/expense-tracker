import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0 space-y-1 sm:space-y-1.5">
        <h1 className="text-pretty text-[1.25rem] font-semibold tracking-tight sm:text-[1.35rem] md:text-2xl">
          {title}
        </h1>
        {description ? (
          <div className="max-w-2xl text-pretty text-xs text-muted-foreground sm:text-sm">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
