import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  Tags,
} from 'lucide-react'
import { cn } from 'cn'
import { ModeToggle } from '#/app/mode-toggle'
import { prefetchRoute } from '#/lib/query/prefetch'

const links = [
  {
    to: '/' as const,
    label: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: '/ledger' as const,
    label: 'Ledger',
    icon: Receipt,
    exact: false,
  },
  {
    to: '/recurring' as const,
    label: 'Recurring',
    icon: Repeat,
    exact: false,
  },
  {
    to: '/categories' as const,
    label: 'Categories',
    icon: Tags,
    exact: false,
  },
]

export function AppNav() {
  const queryClient = useQueryClient()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <header className="z-10 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md">
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
            const active = link.exact
              ? pathname === link.to
              : pathname.startsWith(link.to)
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                onMouseEnter={() => prefetchRoute(queryClient, link.to)}
                onFocus={() => prefetchRoute(queryClient, link.to)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline transition-colors duration-150',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={link.label}
              >
                <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            )
          })}
        </nav>
        <ModeToggle />
      </div>
    </header>
  )
}
