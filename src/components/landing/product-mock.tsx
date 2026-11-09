import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartPie,
  Wallet,
} from 'lucide-react'
import { cn } from 'cn'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { StatTile } from '#/features/shared/stat-tile'

const STATS = [
  {
    label: 'Income',
    tone: 'income' as const,
    icon: <ArrowDownLeft />,
    value: '$3,200.00',
    hint: 'vs last month',
    mobile: true,
  },
  {
    label: 'Expenses',
    tone: 'expense' as const,
    icon: <ArrowUpRight />,
    value: '$1,373.20',
    hint: 'vs last month',
    mobile: true,
  },
  {
    label: 'Budget left',
    tone: 'default' as const,
    icon: <Wallet />,
    value: '$1,126.80',
    hint: 'of $2,500.00',
    mobile: false,
  },
  {
    label: 'Budget used',
    tone: 'default' as const,
    icon: <ChartPie />,
    value: '54.9%',
    hint: (
      <div className="flex min-h-5 items-center">
        <Progress
          className="h-1.5 w-full"
          value={54.9}
          aria-label="Budget used"
        />
      </div>
    ),
    mobile: false,
  },
]

const ROWS = [
  {
    name: 'Payroll',
    meta: 'Income · Mar 1',
    amount: '+$3,200.00',
    tone: 'income' as const,
  },
  {
    name: 'Studio rent',
    meta: 'Housing · Mar 1',
    amount: '−$1,200.00',
    tone: 'expense' as const,
  },
  {
    name: 'Groceries',
    meta: 'Food · Mar 3',
    amount: '−$84.20',
    tone: 'expense' as const,
  },
  {
    name: 'Transit pass',
    meta: 'Transport · Mar 5',
    amount: '−$89.00',
    tone: 'expense' as const,
    desktopOnly: true,
  },
]

export function LandingProductMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2.5 md:gap-3',
        'rounded-2xl border border-border/80 bg-card p-2.5 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none',
        '[&_.stat-tile_p]:text-foreground/80',
        className,
      )}
      aria-hidden
    >
      <section
        className="grid shrink-0 grid-cols-2 items-stretch gap-2 md:gap-3"
        role="presentation"
      >
        {STATS.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            tone={stat.tone}
            icon={stat.icon}
            className={cn(
              'h-full rounded-xl px-3 py-3 shadow-none md:px-3.5 md:py-3.5 md:shadow-sm',
              !stat.mobile && 'max-md:hidden',
            )}
            value={
              <span
                className={cn(
                  'font-semibold tracking-tight tabular-nums text-lg md:text-xl',
                  stat.tone === 'income' && 'text-income',
                  stat.tone === 'expense' && 'text-expense',
                )}
              >
                {stat.value}
              </span>
            }
            hint={stat.mobile ? undefined : stat.hint}
          />
        ))}
      </section>

      <Card className="min-w-0 gap-0 border-border/80 py-0 shadow-none md:border-border">
        <CardHeader className="border-b py-2.5 md:py-3">
          <CardTitle className="text-sm md:text-base">Recent transactions</CardTitle>
          <CardDescription className="text-foreground/65">March 2026</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0.5 md:pb-1">
          <ul className="divide-y divide-border/60">
            {ROWS.map((row) => (
              <li
                key={row.name}
                className={cn(
                  'flex min-h-12 items-center justify-between gap-3 px-3.5 py-2 md:min-h-14 md:px-4 md:py-2.5',
                  row.desktopOnly && 'hidden md:flex',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-foreground/75">{row.meta}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-medium tabular-nums md:text-[0.95rem]',
                    row.tone === 'income' ? 'text-income' : 'text-expense',
                  )}
                >
                  {row.amount}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
