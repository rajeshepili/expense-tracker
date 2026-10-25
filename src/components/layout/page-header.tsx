import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-pretty text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
        <div className="max-w-2xl text-pretty text-xs text-muted-foreground sm:text-sm">
          {description}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
