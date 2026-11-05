import { APP_URL, MARKETING_URL, SITE_MODE } from '#/lib/brand'

export type SiteMode = 'app' | 'marketing'

/**
 * Marketing-owned paths (marketing route tree only).
 * Kept as a plain list so this module does not depend on either generated tree.
 */
export const MARKETING_ROUTE_PATHS = ['/features', '/privacy'] as const

/**
 * App-owned paths that must redirect away from the marketing host.
 * Index (`/`) is shared (landing on marketing, overview on app).
 */
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

/**
 * Which SITE_MODE this hostname should be serving.
 * Returns null for unknown/custom hosts (no hard fail — allow preview aliases).
 */
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

/**
 * Compare build-time SITE_MODE against the host we are running on.
 * Mismatch = wrong Vercel project env var or custom domain pointed at the wrong project.
 */
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
  /** When set, redirects only fire if this host is part of the two-host split. */
  hostname?: string
}

/**
 * Where a wrong-host pathname should bounce.
 * Returns null when the current mode already owns the path, or when the
 * hostname is not part of the two-host split (plain `localhost` / `pnpm dev`
 * single-origin fallback — redirects only fire under portless `.localhost`
 * names or the production hosts).
 */
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
