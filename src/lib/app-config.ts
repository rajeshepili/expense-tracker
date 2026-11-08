export const RECENT_TRANSACTION_LIMIT = 10
export const UPCOMING_RECURRING_LIMIT = 4
export const DUE_RECURRING_LIMIT = 8
/** Ledger list page size (CSV export uses its own limit). */
export const LEDGER_PAGE_SIZE = 300
/** Max rows when listing payments for one recurring bill. */
export const RECURRING_PAYMENT_HISTORY_LIMIT = 100

export const NAV_PATHS = [
  '/',
  '/ledger',
  '/recurring',
  '/categories',
  '/savings',
] as const
