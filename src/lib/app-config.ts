export const RECENT_TRANSACTION_LIMIT = 10
export const UPCOMING_RECURRING_LIMIT = 4
export const DUE_RECURRING_LIMIT = 8

/**
 * Primary nav order (left → right in the tab bar). Used to derive the
 * directional route-slide: moving to a higher index = nav-forward,
 * lower = nav-back. Browser back (POP) always wins with nav-back.
 */
export const NAV_PATHS = [
  '/',
  '/ledger',
  '/recurring',
  '/categories',
  '/savings',
] as const
