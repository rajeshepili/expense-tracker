export const APP_NAME = 'Pocketbook'

export const APP_SHORT_NAME = 'Pocketbook'

export const APP_TAGLINE = 'A ledger that stays in this browser.'

export const APP_DESCRIPTION =
  'No account or cloud sync. Chrome on Android, or Chrome / Edge on desktop.'

// Dev defaults: docs/deploy.md (portless). Prod: two-project split.
const LOCAL_APP_URL = 'https://app.pocketbook.localhost'
const LOCAL_MARKETING_URL = 'https://pocketbook.localhost'
const PROD_APP_URL = 'https://expense-tracker-amber-two-58.vercel.app'
const PROD_MARKETING_URL = 'https://expense-tracker-mkt.vercel.app'

export const MARKETING_URL =
  (import.meta.env.VITE_MARKETING_URL as string | undefined) ??
  (import.meta.env.DEV ? LOCAL_MARKETING_URL : PROD_MARKETING_URL)

export const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) ??
  (import.meta.env.DEV ? LOCAL_APP_URL : PROD_APP_URL)

export const APP_SETUP_URL = `${APP_URL.replace(/\/$/, '')}/?from=mkt`

export const SITE_MODE: 'app' | 'marketing' =
  (import.meta.env.VITE_SITE_MODE as 'app' | 'marketing' | undefined) ?? 'app'

/** Absolute marketing-home URL when the app host needs a cross-origin link. */
export function marketingHomeHref() {
  return SITE_MODE === 'marketing' ? '/' : MARKETING_URL
}
