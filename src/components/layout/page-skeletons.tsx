import { cn } from 'cn'

export function Skel({ className }: { className: string }) {
  return <div className={cn('skeleton-shimmer', className)} />
}

export function PageHeaderSkeleton({
  titleWidth = 'w-28',
}: {
  titleWidth?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skel className={cn('h-7 rounded', titleWidth)} />
        <Skel className="h-4 w-48 max-w-full rounded" />
      </div>
      <Skel className="h-9 w-24 shrink-0 rounded-md" />
    </div>
  )
}

export function FilterStripSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className="flex gap-1.5">
        {[...Array(3)].map((_, i) => (
          <Skel key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>
      <Skel className="h-10 w-full rounded-md" />
    </div>
  )
}

export function ListRowsSkeleton({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/40 px-3.5 py-3.5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skel className="h-4 w-36 max-w-full rounded" />
            <Skel className="h-3 w-24 max-w-[70%] rounded" />
          </div>
          <Skel className="h-5 w-16 shrink-0 rounded tabular-nums" />
        </div>
      ))}
    </div>
  )
}

export function StatsGridSkeleton() {
  return (
    <section
      className="grid shrink-0 grid-cols-2 gap-2 md:gap-3 xl:grid-cols-4"
      aria-hidden
    >
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="stat-tile overflow-visible rounded-xl border px-3.5 py-3.5"
        >
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

export function LedgerPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" aria-hidden>
      <PageHeaderSkeleton titleWidth="w-24" />
      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-border/60 bg-card py-0 shadow-sm">
        <div className="shrink-0 space-y-2 border-b px-4 py-3">
          <Skel className="h-4 w-28 rounded" />
          <Skel className="h-3 w-48 max-w-full rounded" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <FilterStripSkeleton />
          <ListRowsSkeleton rows={8} className="min-h-0 flex-1" />
        </div>
      </div>
    </div>
  )
}

export function RecurringPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" aria-hidden>
      <PageHeaderSkeleton titleWidth="w-36" />
      <div className="grid grid-cols-2 gap-2">
        <Skel className="h-20 rounded-xl border" />
        <Skel className="h-20 rounded-xl border" />
      </div>
      <ListRowsSkeleton rows={5} />
    </div>
  )
}

export function CategoriesPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" aria-hidden>
      <PageHeaderSkeleton titleWidth="w-32" />
      <div className="flex gap-1.5">
        {[...Array(3)].map((_, i) => (
          <Skel key={i} className="h-9 w-20 rounded-md" />
        ))}
      </div>
      <ListRowsSkeleton rows={6} />
    </div>
  )
}

export function SavingsPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" aria-hidden>
      <PageHeaderSkeleton titleWidth="w-40" />
      <div className="space-y-3" aria-hidden>
        {[...Array(3)].map((_, i) => (
          <Skel key={i} className="h-28 w-full rounded-xl border" />
        ))}
      </div>
    </div>
  )
}

export function OverviewBodySkeleton() {
  return (
    <div className="flex min-h-0 flex-col gap-4 md:gap-5" aria-hidden>
      <StatsGridSkeleton />
      <div className="grid shrink-0 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <ListRowsSkeleton rows={4} />
          <Skel className="h-32 w-full rounded-xl border" />
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <Skel className="h-48 w-full rounded-xl border" />
          <ListRowsSkeleton rows={3} />
        </div>
      </div>
    </div>
  )
}
