export function ledgerHasMore(opts: {
  rowCount: number
  totalCount: number
  pageLimit: number
  totalsPending?: boolean
}): boolean {
  if (opts.totalsPending) return false
  return opts.rowCount < opts.totalCount && opts.rowCount >= opts.pageLimit
}
