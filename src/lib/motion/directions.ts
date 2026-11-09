import { NAV_PATHS } from '#/lib/app-config'

export type NavDirection = 'nav-forward' | 'nav-back'
export type MonthDirection = 'month-forward' | 'month-back'

export function resolveNavDirection(args: {
  fromPathname?: string
  toPathname: string
  fromIndex?: number
  toIndex?: number
}): { type: NavDirection; back: boolean } {
  const { fromPathname, toPathname, fromIndex, toIndex } = args
  if (fromIndex !== undefined && toIndex !== undefined && toIndex < fromIndex) {
    return { type: 'nav-back', back: true }
  }
  const fromNav = NAV_PATHS.indexOf(
    (fromPathname as (typeof NAV_PATHS)[number]) ?? '',
  )
  const toNav = NAV_PATHS.indexOf(toPathname as (typeof NAV_PATHS)[number])
  if (fromNav !== -1 && toNav !== -1 && fromNav !== toNav) {
    const back = toNav < fromNav
    return { type: back ? 'nav-back' : 'nav-forward', back }
  }
  return { type: 'nav-forward', back: false }
}

export function resolveMonthDirection(
  current: string,
  next: string,
): MonthDirection {
  if (next === 'all' || current === 'all') return 'month-forward'
  return next > current ? 'month-forward' : 'month-back'
}
