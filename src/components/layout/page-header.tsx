import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2 md:gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-pretty text-[1.25rem] font-semibold tracking-tight sm:text-[1.35rem] md:text-2xl">
          {title}
        </h1>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <div className="max-w-2xl text-pretty text-xs text-muted-foreground sm:text-sm">
          {description}
        </div>
      ) : null}
    </div>
  )
}
