import type { RecurrenceCadence, TransactionType } from './types'

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'TRY',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'ZAR',
  'NGN',
  'EGP',
  'KES',
  'AED',
  'SAR',
  'ILS',
  'SGD',
  'HKD',
  'TWD',
  'KRW',
  'CNY',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'NZD',
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value)
}

export function currencyLabel(code: string) {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).formatToParts(0)
    const symbol = parts.find((part) => part.type === 'currency')?.value ?? code
    return symbol === code ? code : `${code} (${symbol})`
  } catch {
    return code
  }
}

export const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)

export function formatIsoDate(iso: string, withYear = false) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  }).format(new Date(`${iso}T12:00:00`))
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** YYYY-MM */
export function currentYearMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function isYearMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number) {
  if (!isYearMonth(yearMonth)) return yearMonth
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + deltaMonths, 1))
  return currentYearMonth(date)
}

export function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return yearMonth
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** Negative if a < b (YYYY-MM-DD). */
export function compareIsoDate(a: string, b: string) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

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

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
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

/** Current month → today; other months → last day. */
export function defaultDateForMonth(
  yearMonth: string | undefined,
  today = todayIso(),
) {
  if (!yearMonth || yearMonth === 'all' || !isYearMonth(yearMonth)) {
    return today
  }
  if (yearMonth === currentYearMonth(new Date(`${today}T12:00:00`))) {
    return today
  }
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`
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

/** null when prior is 0 */
export function priorDeltaRatio(current: number, prior: number) {
  if (prior === 0) return current === 0 ? 0 : null
  return (current - prior) / prior
}

export function resolveMonthBudget(
  yearMonth: string,
  defaultBudget: number,
  override: number | undefined,
): {
  yearMonth: string
  budget: number
  defaultBudget: number
  isCustom: boolean
} {
  if (override !== undefined) {
    return {
      yearMonth,
      budget: override,
      defaultBudget,
      isCustom: true,
    }
  }
  return {
    yearMonth,
    budget: defaultBudget,
    defaultBudget,
    isCustom: false,
  }
}

export function monthBudgetMatchesDefault(
  monthBudget: number,
  defaultBudget: number,
) {
  return monthBudget === defaultBudget
}

export function amountToneClass(type: TransactionType) {
  return type === 'income' ? 'text-income' : 'text-expense'
}

export function signedAmountPrefix(type: TransactionType) {
  return type === 'income' ? '+' : '−'
}

export const percent = (value: number) =>
  new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)

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

export function summarizeTransactions(
  rows: Array<{ type: TransactionType; amount: number }>,
) {
  return rows.reduce(
    (acc, row) => {
      if (row.type === 'income') acc.income += row.amount
      else acc.expenses += row.amount
      return acc
    },
    { income: 0, expenses: 0 },
  )
}

export function categoryBudgetBreakdown(
  expenses: Array<{ category: string; amount: number }>,
  budget: number,
) {
  const totals = new Map<string, number>()
  for (const row of expenses) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount)
  }

  const entries = [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const spendTotal = entries.reduce((sum, item) => sum + item.amount, 0)

  return entries.map((row) => ({
    name: row.name,
    amount: row.amount,
    ofSpend: spendTotal > 0 ? row.amount / spendTotal : 0,
    ofBudget: budget > 0 ? row.amount / budget : 0,
  }))
}
