/** User-facing product name. */
export const APP_NAME = 'Pocketbook'

/** PWA / home-screen short label (same word — keep it one brand). */
export const APP_SHORT_NAME = 'Pocketbook'

export const APP_TAGLINE = 'A private ledger that never leaves this browser.'

export const APP_DESCRIPTION =
  'No account. No cloud sync. Install from Chrome on Android, or use Chrome / Edge on desktop.'

/** Local two-origin defaults when running under portless (see docs/deploy.md). */
const LOCAL_APP_URL = 'https://app.pocketbook.localhost'
const LOCAL_MARKETING_URL = 'https://pocketbook.localhost'

/** Production hosts for the two-project split (linux-res-projects). */
const PROD_APP_URL = 'https://expense-tracker-amber-two-58.vercel.app'
const PROD_MARKETING_URL = 'https://expense-tracker-mkt.vercel.app'

/**
 * Deployment hosts for the two-project split (overridable per preview via env).
 * In DEV, default to portless `.localhost` origins so cross-host redirects stay local.
 */
export const MARKETING_URL =
  (import.meta.env.VITE_MARKETING_URL as string | undefined) ??
  (import.meta.env.DEV ? LOCAL_MARKETING_URL : PROD_MARKETING_URL)

export const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) ??
  (import.meta.env.DEV ? LOCAL_APP_URL : PROD_APP_URL)

/** First-run handoff from marketing → app wizard (skips Welcome). */
export const APP_SETUP_URL = `${APP_URL.replace(/\/$/, '')}/?from=mkt`

/** 'app' | 'marketing' — which Vercel project is serving this build. */
export const SITE_MODE: 'app' | 'marketing' =
  (import.meta.env.VITE_SITE_MODE as 'app' | 'marketing' | undefined) ?? 'app'
