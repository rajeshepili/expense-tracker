import { useMemo, useState } from 'react'
import { money, percent } from '#/lib/finance'
import { cn } from 'cn'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

const MAX_NAMED_SLICES = 4

type CategorySlice = {
  name: string
  amount: number
}

type CategorySpendChartProps = {
  categories: CategorySlice[]
  budget: number
  currency: string
  className?: string
}

type PreparedSlice = {
  name: string
  amount: number
  share: number
  color: string
  isRemainder: boolean
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle)
  const end = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

function prepareSlices(
  categories: CategorySlice[],
  budget: number,
): PreparedSlice[] {
  const sorted = [...categories].sort((a, b) => b.amount - a.amount)
  const named = sorted.slice(0, MAX_NAMED_SLICES)
  const rest = sorted.slice(MAX_NAMED_SLICES)
  const restTotal = rest.reduce((sum, row) => sum + row.amount, 0)

  const spent = sorted.reduce((sum, row) => sum + row.amount, 0)
  const unspent = Math.max(0, budget - spent)
  const whole = spent + unspent

  const rows: Array<Omit<PreparedSlice, 'share' | 'color'>> = [
    ...named.map((row) => ({
      name: row.name,
      amount: row.amount,
      isRemainder: false,
    })),
  ]

  if (restTotal > 0) {
    rows.push({
      name: 'Other',
      amount: restTotal,
      isRemainder: false,
    })
  }

  if (unspent > 0 && whole > 0) {
    rows.push({
      name: 'Unspent',
      amount: unspent,
      isRemainder: true,
    })
  }

  return rows.map((row, index) => ({
    ...row,
    share: whole > 0 ? row.amount / whole : 0,
    color: row.isRemainder
      ? 'var(--muted-foreground)'
      : CHART_COLORS[index % CHART_COLORS.length],
  }))
}

export function CategorySpendChart({
  categories,
  budget,
  currency,
  className,
}: CategorySpendChartProps) {
  const [active, setActive] = useState<string | null>(null)

  const slices = useMemo(
    () => prepareSlices(categories, budget),
    [categories, budget],
  )

  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  const summary = slices
    .map((slice) => `${slice.name} ${percent(slice.share)}`)
    .join(', ')

  const cx = 50
  const cy = 50
  const radius = 36
  let angle = 0
  const arcs = slices.map((slice) => {
    const sweep = slice.share * 360
    const start = angle
    const end = angle + sweep
    angle = end
    // Full circle edge case
    const path =
      sweep >= 359.999
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`
        : sweep < 0.01
          ? ''
          : arcPath(cx, cy, radius, start, end)
    return { ...slice, start, end, path }
  })

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative size-36 shrink-0 md:size-44">
          <svg
            viewBox="0 0 100 100"
            className="size-full -rotate-0"
            role="img"
            aria-label={`Category spend: ${summary || 'no data'}`}
          >
            <title>{`Category spend: ${summary || 'no data'}`}</title>
            {total <= 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth="14"
              />
            ) : (
              arcs.map((slice) =>
                slice.path ? (
                  <path
                    key={slice.name}
                    d={slice.path}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={active === slice.name ? 16 : 14}
                    strokeLinecap="butt"
                    className="transition-[stroke-width] duration-150 ease-out"
                    opacity={
                      active && active !== slice.name
                        ? 0.45
                        : slice.isRemainder
                          ? 0.55
                          : 1
                    }
                    onMouseEnter={() => setActive(slice.name)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(slice.name)}
                    onBlur={() => setActive(null)}
                  >
                    <title>
                      {slice.name}: {money(slice.amount, currency)} (
                      {percent(slice.share)})
                    </title>
                  </path>
                ) : null,
              )
            )}
            <circle
              cx={cx}
              cy={cy}
              r={24}
              className="pointer-events-none fill-card"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {active ?? 'Spent'}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {money(
                active
                  ? (slices.find((slice) => slice.name === active)?.amount ?? 0)
                  : categories.reduce((sum, row) => sum + row.amount, 0),
                currency,
              )}
            </p>
          </div>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-2" aria-label="Legend">
          {slices.map((slice) => (
            <li key={slice.name}>
              <button
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-md px-1.5 py-1 text-left transition-colors duration-150 ease-out',
                  active === slice.name ? 'bg-muted' : 'hover:bg-muted/70',
                )}
                onMouseEnter={() => setActive(slice.name)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(slice.name)}
                onBlur={() => setActive(null)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{
                      background: slice.color,
                      opacity: slice.isRemainder ? 0.55 : 1,
                    }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">
                    {slice.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {money(slice.amount, currency)} · {percent(slice.share)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  )
}
