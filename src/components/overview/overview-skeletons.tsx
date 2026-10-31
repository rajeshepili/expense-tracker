import { cn } from 'cn'

/** Shimmering placeholder block — GPU-only transform sweep on ::after. */
function Skel({ className }: { className: string }) {
  return <div className={cn('skeleton-shimmer', className)} />
}

export function OverviewStatsSkeleton() {
  return (
    <section
      className={cn(
        'grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4',
      )}
      aria-hidden="true"
    >
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-tile overflow-visible rounded-lg border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Skel className="h-3 w-20 rounded" />
            <Skel className="h-3.5 w-3.5 rounded" />
          </div>
          <Skel className="mt-1 h-7 w-28 rounded" />
          <Skel className="mt-1 h-3 w-16 rounded" />
        </div>
      ))}
    </section>
  )
}

export function OverviewRecentSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
        >
          <Skel className="h-4 w-32 rounded" />
          <Skel className="flex-1 h-3 w-full rounded" />
        </div>
      ))}
    </div>
  )
}

export function CategoriesSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-3 p-3 rounded-md bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <Skel className="h-4 w-24 rounded" />
            <Skel className="h-3 w-16 rounded" />
          </div>
          <Skel className="h-1 w-full rounded" />
        </div>
      ))}
    </div>
  )
}

export function RecurringSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skel className="h-1.5 w-full rounded" />
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 rounded-md bg-muted/30"
        >
          <div className="min-w-0">
            <Skel className="h-4 w-28 rounded" />
            <Skel className="mt-1 h-3 w-32 rounded" />
          </div>
          <div className="flex shrink-0 flex-col sm:flex-row sm:items-center gap-1.5">
            <Skel className="h-5 w-20 rounded" />
            <Skel className="h-8 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SavingsSummarySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center justify-between gap-2">
        <Skel className="h-4 w-32 rounded" />
        <Skel className="h-8 w-24 rounded" />
      </div>
      <div className="mt-2 space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skel key={i} className="h-20 rounded-lg border" />
        ))}
      </div>
    </div>
  )
}
