import type { ReactNode } from 'react'
import { cn } from 'cn'

type StatTone = 'default' | 'income' | 'expense'

type StatTileProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: StatTone
  className?: string
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}: StatTileProps) {
  return (
    <div
      data-tone={tone}
      className={cn(
        'stat-tile overflow-visible rounded-lg border px-4 py-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span className="text-muted-foreground/80 [&_svg]:size-3.5" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}
