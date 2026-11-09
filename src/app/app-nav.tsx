import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Receipt, Repeat, Tags, Target } from 'lucide-react'
import { cn } from 'cn'
import { ModeToggle } from '#/app/mode-toggle'
import { useMediaQuery } from '#/hooks/use-media-query'
import { NAV_PATHS } from '#/lib/app-config'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import {
  animateChrome,
  motion,
  prefersReducedMotion,
  snapChrome,
} from '#/lib/motion'
import { APP_NAME } from '#/lib/brand'
import { prefetchRoute } from '#/lib/query/prefetch'

const linkMeta: Record<
  (typeof NAV_PATHS)[number],
  {
    label: string
    shortLabel: string
    icon: typeof LayoutDashboard
    exact: boolean
  }
> = {
  '/': {
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  '/ledger': {
    label: 'Ledger',
    shortLabel: 'Ledger',
    icon: Receipt,
    exact: false,
  },
  '/recurring': {
    label: 'Bills',
    shortLabel: 'Bills',
    icon: Repeat,
    exact: false,
  },
  '/categories': {
    label: 'Categories',
    shortLabel: 'Categories',
    icon: Tags,
    exact: false,
  },
  '/savings': {
    label: 'Goals',
    shortLabel: 'Goals',
    icon: Target,
    exact: false,
  },
}

const links = NAV_PATHS.map((to) => ({ to, ...linkMeta[to] }))

function isActive(pathname: string, link: (typeof links)[number]) {
  return link.exact ? pathname === link.to : pathname.startsWith(link.to)
}

const tabClass = cn(
  'touch-manipulation relative inline-flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[0.6875rem] font-medium leading-none no-underline',
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

function useNavPill<T extends HTMLElement>(
  activeIndex: number,
  visible: boolean,
) {
  const containerRef = useRef<T | null>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const pillRef = useRef<HTMLSpanElement | null>(null)
  const [ready, setReady] = useState(false)
  const hasAnimated = useRef(false)

  useLayoutEffect(() => {
    if (!visible || activeIndex < 0) {
      hasAnimated.current = false
      setReady(false)
      return
    }
    const measure = () => {
      const container = containerRef.current
      const el = itemRefs.current[activeIndex]
      const node = pillRef.current
      if (!container || !el || !node) return
      const c = container.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return

      const x = r.left - c.left
      const y = r.top - c.top
      const width = r.width
      const height = r.height

      // During route VT, snap — live spring fighting the chrome snapshot flickers
      // (especially fixed mobile tabs). Otherwise spring with velocity retargets.
      const routeVt =
        typeof document !== 'undefined' &&
        Boolean(document.documentElement.dataset.vtRoute)

      if (!hasAnimated.current || prefersReducedMotion() || routeVt) {
        snapChrome(node, {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${x}px, ${y}px)`,
        })
        hasAnimated.current = true
      } else {
        animateChrome(node, { x, y, width, height })
      }
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

  return { containerRef, itemRefs, pillRef, ready }
}

export function AppNav() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onLinkClick =
    (to: (typeof NAV_PATHS)[number]) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      if (!motion.can('navigate')) return
      event.preventDefault()
      void navigateAfterPrefetch(router, queryClient, { to })
    }
  // -1 when on a route outside the tab bar (e.g. /year) — do not force Home.
  const activeIndex = links.findIndex((link) => isActive(pathname, link))
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const desktopNav = useNavPill<HTMLElement>(activeIndex, isDesktop)
  const mobileNav = useNavPill<HTMLDivElement>(activeIndex, !isDesktop)

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header
        data-app-chrome="top-desktop"
        className="z-10 hidden shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-md md:block"
      >
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-4 px-6 md:px-8">
          <Link
            to="/"
            className="brand-wordmark shrink-0 text-sm font-semibold tracking-tight text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onMouseEnter={() => prefetchRoute(queryClient, '/')}
            onFocus={() => prefetchRoute(queryClient, '/')}
          >
            {APP_NAME}
          </Link>
          <nav
            data-tour="nav"
            ref={desktopNav.containerRef}
            className="relative flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            <span
              ref={desktopNav.pillRef}
              aria-hidden
              className={cn(
                'nav-pill pointer-events-none absolute rounded-md bg-secondary',
                !desktopNav.ready && 'opacity-0',
              )}
            />
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
      <header
        data-app-chrome="top-mobile"
        className="z-10 shrink-0 border-b border-border/80 bg-background/80 pt-(--safe-top) backdrop-blur-md md:hidden"
      >
        <div className="flex h-12 items-center justify-between gap-3 px-4">
          <Link
            to="/"
            className="brand-wordmark text-sm font-semibold tracking-tight text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onMouseEnter={() => prefetchRoute(queryClient, '/')}
            onFocus={() => prefetchRoute(queryClient, '/')}
          >
            {APP_NAME}
          </Link>
          <ModeToggle />
        </div>
      </header>

      {/* Phone: bottom tabs */}
      <nav
        data-tour="nav"
        data-app-chrome="tabs"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 pb-(--safe-bottom) backdrop-blur-md md:hidden"
        aria-label="Primary"
      >
        <div
          ref={mobileNav.containerRef}
          className="relative mx-auto flex h-12 max-w-lg items-center gap-0.5 px-1.5"
        >
          <span
            ref={mobileNav.pillRef}
            aria-hidden
            className={cn(
              'nav-pill pointer-events-none absolute rounded-md bg-secondary',
              !mobileNav.ready && 'opacity-0',
            )}
          />
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
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="max-w-full truncate leading-none">
                  {link.shortLabel}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
