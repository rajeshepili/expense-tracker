export const RECENT_TRANSACTION_LIMIT = 10
export const UPCOMING_RECURRING_LIMIT = 4
export const DUE_RECURRING_LIMIT = 8
/** Default SQL page size for the ledger list (not export). */
export const LEDGER_PAGE_SIZE = 300

export const NAV_PATHS = [
  '/',
  '/ledger',
  '/recurring',
  '/categories',
  '/savings',
] as const
