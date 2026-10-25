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

/** Calendar month key used for budgets and month filters (YYYY-MM). */
export function currentYearMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return yearMonth
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

/** Merge default + optional month override into the effective month budget. */
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

/** When saving, matching the default clears the month override. */
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
