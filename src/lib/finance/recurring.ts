import type { RecurrenceCadence } from '#/lib/types'
import { compareIsoDate, todayIso } from './dates'
import { roundMoney } from './budget'

export type DueStatus = 'upcoming' | 'due' | 'overdue'

export function dueStatus(nextDate: string, today = todayIso()): DueStatus {
  const cmp = compareIsoDate(nextDate, today)
  if (cmp < 0) return 'overdue'
  if (cmp === 0) return 'due'
  return 'upcoming'
}

/** Record one-tap only when due/overdue. */
export function canOneTapRecord(nextDate: string, today = todayIso()) {
  return dueStatus(nextDate, today) !== 'upcoming'
}

export function amountDue(bill: {
  amount: number
  remainingAmount: number | null
}) {
  return bill.remainingAmount ?? bill.amount
}

/** Underpay keeps remaining; full/over settles. */
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

/** Advance past this cycle and drop any partial remaining balance. */
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
