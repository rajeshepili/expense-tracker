import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Receipt, Repeat, Tags } from 'lucide-react'
import { cn } from 'cn'
import { ModeToggle } from '#/app/mode-toggle'
import { prefetchRoute } from '#/lib/query/prefetch'

const links = [
  {
    to: '/' as const,
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: '/ledger' as const,
    label: 'Ledger',
    shortLabel: 'Ledger',
    icon: Receipt,
    exact: false,
  },
  {
    to: '/recurring' as const,
    label: 'Recurring',
    shortLabel: 'Bills',
    icon: Repeat,
    exact: false,
  },
  {
    to: '/categories' as const,
    label: 'Categories',
    shortLabel: 'Categories',
    icon: Tags,
    exact: false,
  },
]

function isActive(pathname: string, link: (typeof links)[number]) {
  return link.exact ? pathname === link.to : pathname.startsWith(link.to)
}

const tabClass = cn(
  'touch-manipulation inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[0.65rem] font-medium no-underline',
  'transition-[transform,color,background-color] duration-150 ease-out',
  'active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
)

const desktopLinkClass = cn(
  'touch-manipulation inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline',
  'transition-[transform,color,background-color] duration-150 ease-out',
  'active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
)

export function AppNav() {
  const queryClient = useQueryClient()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header className="z-10 hidden shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md md:block">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-4 px-6 md:px-8">
          <Link
            to="/"
            className="shrink-0 text-sm font-semibold tracking-tight text-foreground no-underline"
            onMouseEnter={() => prefetchRoute(queryClient, '/')}
            onFocus={() => prefetchRoute(queryClient, '/')}
          >
            Expense Tracker
          </Link>
          <nav
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            {links.map((link) => {
              const active = isActive(pathname, link)
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  onMouseEnter={() => prefetchRoute(queryClient, link.to)}
                  onFocus={() => prefetchRoute(queryClient, link.to)}
                  className={cn(
                    desktopLinkClass,
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
          <ModeToggle />
        </div>
      </header>

      {/* Phone: compact top bar (brand + theme) */}
      <header className="z-10 shrink-0 border-b border-border/80 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <div className="flex h-12 items-center justify-between gap-3 px-4">
          <Link
            to="/"
            className="text-sm font-semibold tracking-tight text-foreground no-underline"
            onMouseEnter={() => prefetchRoute(queryClient, '/')}
            onFocus={() => prefetchRoute(queryClient, '/')}
          >
            Expense Tracker
          </Link>
          <ModeToggle />
        </div>
      </header>

      {/* Phone: bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 pt-1">
          {links.map((link) => {
            const active = isActive(pathname, link)
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onMouseEnter={() => prefetchRoute(queryClient, link.to)}
                onFocus={() => prefetchRoute(queryClient, link.to)}
                className={cn(
                  tabClass,
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md',
                    active && 'bg-secondary',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                </span>
                <span className="max-w-full truncate">{link.shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
