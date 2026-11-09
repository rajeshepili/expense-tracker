import type { RecurrenceCadence, RecurringExpenseRow } from '#/lib/types'
import { compareIsoDate, currentYearMonth, todayIso, yearMonthRange } from './dates'
import { roundMoney } from './budget'

export type DueStatus = 'upcoming' | 'due' | 'overdue'

export function dueStatus(nextDate: string, today = todayIso()): DueStatus {
  const cmp = compareIsoDate(nextDate, today)
  if (cmp < 0) return 'overdue'
  if (cmp === 0) return 'due'
  return 'upcoming'
}

export function canOneTapRecord(nextDate: string, today = todayIso()) {
  return dueStatus(nextDate, today) !== 'upcoming'
}

export function amountDue(bill: {
  amount: number
  remainingAmount: number | null
}) {
  return bill.remainingAmount ?? bill.amount
}

export function settleRecurringPayment(
  due: number,
  paid: number,
): { kind: 'partial'; remaining: number } | { kind: 'settled' } {
  const dueRounded = roundMoney(due)
  const paidRounded = roundMoney(paid)
  const remaining = roundMoney(dueRounded - paidRounded)
  if (remaining > 0) {
    return { kind: 'partial', remaining }
  }
  return { kind: 'settled' }
}

export function defaultRecordDate(nextDate: string, today = todayIso()) {
  return compareIsoDate(nextDate, today) < 0 ? today : nextDate
}

export function skipRecurringPatch(bill: {
  nextDate: string
  cadence: RecurrenceCadence
}) {
  return {
    nextDate: advanceRecurringDate(bill.nextDate, bill.cadence),
    remainingAmount: null,
  }
}

export function advanceRecurringDate(
  isoDate: string,
  cadence: RecurrenceCadence,
) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const date = new Date(Date.UTC(year, month - 1, day))
  if (cadence === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7)
  } else if (cadence === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + 1)
  } else {
    const targetDay = day
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + 1)
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate()
    date.setUTCDate(Math.min(targetDay, lastDay))
  }
  return date.toISOString().slice(0, 10)
}

export const cadenceLabel: Record<RecurrenceCadence, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export function monthlyEquivalent(
  amount: number,
  cadence: RecurrenceCadence,
): number {
  if (cadence === 'weekly') return amount * (52 / 12)
  if (cadence === 'yearly') return amount / 12
  return amount
}

export type RecurringMonthPartition = {
  /** Active bills with nextDate before the next month (includes overdue). */
  thisMonth: RecurringExpenseRow[]
  /** Active bills whose next hit is after this month. */
  later: RecurringExpenseRow[]
  paused: RecurringExpenseRow[]
}

/** Active due this month vs later vs paused. */
export function partitionRecurringForMonth(
  items: RecurringExpenseRow[],
  yearMonth = currentYearMonth(),
): RecurringMonthPartition {
  const { to } = yearMonthRange(yearMonth)
  const thisMonth: RecurringExpenseRow[] = []
  const later: RecurringExpenseRow[] = []
  const paused: RecurringExpenseRow[] = []

  for (const item of items) {
    if (!item.active) {
      paused.push(item)
      continue
    }
    if (item.nextDate < to) {
      thisMonth.push(item)
    } else {
      later.push(item)
    }
  }

  return { thisMonth, later, paused }
}
