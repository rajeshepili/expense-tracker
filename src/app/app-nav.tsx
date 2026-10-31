import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Receipt, Repeat, Tags, Target } from 'lucide-react'
import { cn } from 'cn'
import { ModeToggle } from '#/app/mode-toggle'
import { useMediaQuery } from '#/hooks/use-media-query'
import { NAV_PATHS } from '#/lib/app-config'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { motion } from '#/lib/motion'
import { prefetchRoute } from '#/lib/query/prefetch'

const linkMeta: Record<(typeof NAV_PATHS)[number], { label: string; shortLabel: string; icon: typeof LayoutDashboard; exact: boolean }> = {
  '/': { label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard, exact: true },
  '/ledger': { label: 'Ledger', shortLabel: 'Ledger', icon: Receipt, exact: false },
  '/recurring': { label: 'Recurring', shortLabel: 'Bills', icon: Repeat, exact: false },
  '/categories': { label: 'Categories', shortLabel: 'Categories', icon: Tags, exact: false },
  '/savings': { label: 'Savings', shortLabel: 'Goals', icon: Target, exact: false },
}

const links = NAV_PATHS.map((to) => ({ to, ...linkMeta[to] }))

function isActive(pathname: string, link: (typeof links)[number]) {
  return link.exact ? pathname === link.to : pathname.startsWith(link.to)
}

const tabClass = cn(
  'touch-manipulation relative inline-flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[0.6875rem] font-medium no-underline',
  'transition-[transform,color] duration-settle ease-settle',
  'active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
)

const desktopLinkClass = cn(
  'touch-manipulation relative inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline',
  'transition-[transform,color] duration-settle ease-settle',
  'active:scale-[0.97]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
)

type Pill = { left: number; width: number; height: number; top: number; visible: boolean }

/** Measure the active nav item and slide a shared pill underneath it. */
function useNavPill<T extends HTMLElement>(activeIndex: number, visible: boolean) {
  const containerRef = useRef<T | null>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, height: 0, top: 0, visible: false })
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    if (!visible) return
    const measure = () => {
      const container = containerRef.current
      const el = itemRefs.current[activeIndex]
      if (!container || !el) return
      const c = container.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      setPill({
        left: r.left - c.left,
        top: r.top - c.top,
        width: r.width,
        height: r.height,
        visible: true,
      })
      setReady(true)
    }
    measure()
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeIndex, visible])

  return { containerRef, itemRefs, pill, ready }
}

export function AppNav() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onLinkClick = (to: (typeof NAV_PATHS)[number]) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!motion.can('navigate')) return
    event.preventDefault()
    void navigateAfterPrefetch(router, queryClient, { to })
  }
  const activeIndex = Math.max(
    0,
    links.findIndex((link) => isActive(pathname, link)),
  )
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const desktopNav = useNavPill<HTMLElement>(activeIndex, isDesktop)
  const mobileNav = useNavPill<HTMLDivElement>(activeIndex, !isDesktop)

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
            data-tour="nav"
            ref={desktopNav.containerRef}
            className="relative flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            {desktopNav.ready && (
            <span
              aria-hidden
              className="nav-pill pointer-events-none absolute rounded-md bg-secondary"
              style={{
                transform: `translate(${desktopNav.pill.left}px, ${desktopNav.pill.top}px)`,
                width: desktopNav.pill.width,
                height: desktopNav.pill.height,
              }}
            />)}
            {links.map((link, i) => {
              const active = isActive(pathname, link)
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  ref={(el) => {
                    desktopNav.itemRefs.current[i] = el
                  }}
                  title={link.label}
                  onMouseEnter={() => prefetchRoute(queryClient, link.to)}
                  onFocus={() => prefetchRoute(queryClient, link.to)}
                  onClick={onLinkClick(link.to)}
                  className={cn(
                    desktopLinkClass,
                    active
                      ? 'text-foreground'
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
      <header className="z-10 shrink-0 border-b border-border/80 bg-background/80 pt-[var(--safe-top)] backdrop-blur-md md:hidden">
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
        data-tour="nav"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 pb-[var(--safe-bottom)] backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div
          ref={mobileNav.containerRef}
          className="relative mx-auto flex max-w-lg items-stretch gap-1 px-2 pt-1"
        >
          {mobileNav.ready && (
          <span
            aria-hidden
            className="nav-pill pointer-events-none absolute rounded-md bg-secondary"
            style={{
              transform: `translate(${mobileNav.pill.left}px, ${mobileNav.pill.top}px)`,
              width: mobileNav.pill.width,
              height: mobileNav.pill.height,
            }}
          />)}
          {links.map((link, i) => {
            const active = isActive(pathname, link)
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                ref={(el) => {
                  mobileNav.itemRefs.current[i] = el
                }}
                onMouseEnter={() => prefetchRoute(queryClient, link.to)}
                onFocus={() => prefetchRoute(queryClient, link.to)}
                onClick={onLinkClick(link.to)}
                className={cn(
                  tabClass,
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="flex size-8 items-center justify-center rounded-md">
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
