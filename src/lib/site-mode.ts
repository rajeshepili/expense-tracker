import { APP_URL, MARKETING_URL, SITE_MODE } from '#/lib/brand'

export type SiteMode = 'app' | 'marketing'

/** Landing-host routes. */
export const MARKETING_ROUTE_PATHS = ['/features', '/privacy'] as const

/** App-only paths (landing host redirects these to the app URL). */
export const APP_ROUTE_PATHS = [
  '/ledger',
  '/recurring',
  '/savings',
  '/categories',
  '/year',
] as const

export type MarketingRoutePath = (typeof MARKETING_ROUTE_PATHS)[number]
export type AppRoutePath = (typeof APP_ROUTE_PATHS)[number]

/** Exact match or path-segment prefix (`/ledger` matches `/ledger/foo`, not `/ledgerx`). */
export function pathMatchesRoute(pathname: string, routePath: string): boolean {
  if (pathname === routePath) return true
  return pathname.startsWith(`${routePath}/`)
}

export function isMarketingPath(pathname: string): boolean {
  return MARKETING_ROUTE_PATHS.some((p) => pathMatchesRoute(pathname, p))
}

export function isAppOnlyPath(pathname: string): boolean {
  return APP_ROUTE_PATHS.some((p) => pathMatchesRoute(pathname, p))
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** Expected SITE_MODE for host; null if unknown/preview. */
export function expectedModeForHost(
  hostname: string,
  appUrl = APP_URL,
  marketingUrl = MARKETING_URL,
): SiteMode | null {
  const host = hostname.toLowerCase()
  const appHost = hostnameOf(appUrl)?.toLowerCase()
  const mktHost = hostnameOf(marketingUrl)?.toLowerCase()
  if (appHost && host === appHost) return 'app'
  if (mktHost && host === mktHost) return 'marketing'
  return null
}

export type ModeConsistency =
  | { ok: true; expected: SiteMode | null }
  | { ok: false; expected: SiteMode; actual: SiteMode; message: string }

/** Host vs baked VITE_SITE_MODE. */
export function checkModeConsistency(
  hostname: string,
  mode: SiteMode = SITE_MODE,
  appUrl = APP_URL,
  marketingUrl = MARKETING_URL,
): ModeConsistency {
  const expected = expectedModeForHost(hostname, appUrl, marketingUrl)
  if (expected === null) return { ok: true, expected: null }
  if (expected === mode) return { ok: true, expected }
  return {
    ok: false,
    expected,
    actual: mode,
    message: `This build is deployed to the wrong host — expected ${expected} mode for ${hostname}, but VITE_SITE_MODE baked in as ${mode}.`,
  }
}

export type RedirectOpts = {
  mode?: SiteMode
  appUrl?: string
  marketingUrl?: string
  hostname?: string
}

/** Cross-origin redirect URL for a wrong-host path, or null. */
export function redirectForCurrentRoute(
  pathname: string,
  opts: RedirectOpts = {},
): string | null {
  const mode = opts.mode ?? SITE_MODE
  const appUrl = opts.appUrl ?? APP_URL
  const marketingUrl = opts.marketingUrl ?? MARKETING_URL
  if (opts.hostname !== undefined) {
    const expected = expectedModeForHost(opts.hostname, appUrl, marketingUrl)
    // Unknown host (e.g. localhost:3000): keep single-origin fallback.
    if (expected === null) return null
  }
  if (mode === 'marketing') {
    if (isAppOnlyPath(pathname)) return `${appUrl}${pathname}`
    return null
  }
  if (isMarketingPath(pathname)) return `${marketingUrl}${pathname}`
  return null
}
