import type { RecurrenceCadence, TransactionType } from '#/lib/types'
import { todayIso } from '#/lib/finance'

export type { RecurrenceCadence, TransactionType }

/**
 * Past date within the current calendar month (so “this month” ledger shows
 * sample rows). `daysAgo` is clamped so we never cross the month boundary.
 */
function recentInMonth(daysAgo: number, from = todayIso()) {
  const d = new Date(`${from}T12:00:00`)
  const day = d.getDate()
  const offset = Math.min(Math.max(0, daysAgo), Math.max(0, day - 1))
  d.setDate(day - offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Future (or today) ISO date — may cross months for yearly/recurring demos. */
function offsetIso(days: number, from = todayIso()) {
  const d = new Date(`${from}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const ledgerTransactions = [
  {
    id: '1',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: recentInMonth(0),
    amount: 64.2,
    type: 'expense' as TransactionType,
  },
  {
    id: '2',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: recentInMonth(1),
    amount: 4200,
    type: 'income' as TransactionType,
  },
  {
    id: '3',
    description: 'Transit pass',
    category: 'Transport',
    paymentMethod: 'Cash',
    date: recentInMonth(1),
    amount: 89,
    type: 'expense' as TransactionType,
  },
  {
    id: '4',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: recentInMonth(2),
    amount: 1200,
    type: 'expense' as TransactionType,
  },
  {
    id: '5',
    description: 'Pharmacy',
    category: 'Health',
    paymentMethod: 'Debit card',
    date: recentInMonth(2),
    amount: 28.5,
    type: 'expense' as TransactionType,
  },
  {
    id: '6',
    description: 'Coffee shop',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: recentInMonth(2),
    amount: 6.75,
    type: 'expense' as TransactionType,
  },
  {
    id: '7',
    description: 'Freelance invoice',
    category: 'Income',
    paymentMethod: 'Bank transfer',
    date: recentInMonth(2),
    amount: 350,
    type: 'income' as TransactionType,
  },
  {
    id: '8',
    description: 'Streaming',
    category: 'Other',
    paymentMethod: 'Credit card',
    date: recentInMonth(2),
    amount: 15.99,
    type: 'expense' as TransactionType,
  },
  {
    id: '9',
    description: 'Gym membership',
    category: 'Health',
    paymentMethod: 'Credit card',
    date: recentInMonth(2),
    amount: 45,
    type: 'expense' as TransactionType,
  },
  {
    id: '10',
    description: 'Weekend market',
    category: 'Food',
    paymentMethod: 'Cash',
    date: recentInMonth(2),
    amount: 38.4,
    type: 'expense' as TransactionType,
  },
]

/** Asset→asset sample transfer (seeded as a linked pair, not a single ledger row). */
export const sampleTransfers = [
  {
    fromAccount: 'Bank transfer',
    toAccount: 'Debit card',
    amount: 200,
    date: recentInMonth(1),
    description: 'Top up spending card',
  },
] as const

export const recurringExpenses = [
  {
    id: 'r1',
    name: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    amount: 1200,
    cadence: 'monthly' as RecurrenceCadence,
    nextDate: offsetIso(0),
    active: true,
  },
  {
    id: 'r2',
    name: 'Transit pass',
    category: 'Transport',
    paymentMethod: 'Debit card',
    amount: 89,
    cadence: 'monthly' as RecurrenceCadence,
    nextDate: offsetIso(0),
    active: true,
  },
  {
    id: 'r3',
    name: 'Gym membership',
    category: 'Health',
    paymentMethod: 'Credit card',
    amount: 45,
    cadence: 'monthly' as RecurrenceCadence,
    nextDate: offsetIso(2),
    active: true,
  },
  {
    id: 'r4',
    name: 'Streaming',
    category: 'Other',
    paymentMethod: 'Credit card',
    amount: 15.99,
    cadence: 'monthly' as RecurrenceCadence,
    nextDate: offsetIso(4),
    active: true,
  },
  {
    id: 'r5',
    name: 'Cloud backup',
    category: 'Other',
    paymentMethod: 'Credit card',
    amount: 2.99,
    cadence: 'monthly' as RecurrenceCadence,
    nextDate: offsetIso(7),
    active: false,
  },
  {
    id: 'r6',
    name: 'Annual domain',
    category: 'Other',
    paymentMethod: 'Debit card',
    amount: 14,
    cadence: 'yearly' as RecurrenceCadence,
    nextDate: offsetIso(120),
    active: true,
  },
]

export const expenseCategories = [
  'Food',
  'Housing',
  'Transport',
  'Health',
  'Other',
] as const

export const paymentMethods = [
  'Debit card',
  'Credit card',
  'Cash',
  'Bank transfer',
  'Direct deposit',
] as const
