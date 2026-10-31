import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from 'cn'

type StatTone = 'default' | 'income' | 'expense'

type StatTileProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: StatTone
  className?: string
  /** Render an "opens something" affordance (shown on hover/focus of a wrapping link). */
  linked?: boolean
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
  linked = false,
}: StatTileProps) {
  return (
    <div
      data-tone={tone}
      className={cn(
        'stat-tile overflow-visible rounded-lg border px-3 py-3 transition-shadow duration-settle ease-settle hover-lift md:px-4 md:py-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
        {linked ? (
          <ArrowUpRight
            aria-hidden
            className="stat-tile-open-icon size-3.5 text-muted-foreground/70"
          />
        ) : icon ? (
          <span
            className="text-muted-foreground/60 [&_svg]:size-3.5"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5">{value}</div>
      {hint ? (
        <div className="mt-1.5 text-xs text-muted-foreground/90">{hint}</div>
      ) : null}
    </div>
  )
}