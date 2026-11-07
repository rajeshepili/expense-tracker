import type { RecurrenceCadence } from '#/lib/types'
import { advanceRecurringDate } from './recurring'
import { compareIsoDate, currentYearMonth, todayIso } from './dates'

export type RecurringProjectionRow = {
  kind: 'expense' | 'income'
  amount: number
  cadence: RecurrenceCadence
  nextDate: string
  active: boolean
}

export type MonthProjection = {
  upcomingIncome: number
  upcomingExpenses: number
  /** upcomingIncome - upcomingExpenses for the rest of the month. */
  net: number
}

function monthOf(isoDate: string) {
  return isoDate.slice(0, 7)
}

/** Recurring amounts still due in `fromDate`'s month. */
export function projectRestOfMonth(
  rows: RecurringProjectionRow[],
  fromDate = todayIso(),
): MonthProjection {
  const month = currentYearMonth(new Date(`${fromDate}T12:00:00`))
  let upcomingIncome = 0
  let upcomingExpenses = 0

  for (const row of rows) {
    if (!row.active) continue
    let cursor = row.nextDate
    // iteration cap
    let iterations = 0
    while (compareIsoDate(cursor, fromDate) >= 0 && monthOf(cursor) === month) {
      if (row.kind === 'income') upcomingIncome += row.amount
      else upcomingExpenses += row.amount
      cursor = advanceRecurringDate(cursor, row.cadence)
      if (++iterations > 60) break
    }
  }

  return {
    upcomingIncome,
    upcomingExpenses,
    net: upcomingIncome - upcomingExpenses,
  }
}
