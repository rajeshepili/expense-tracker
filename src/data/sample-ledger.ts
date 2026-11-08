import type { RecurrenceCadence, TransactionType } from '#/lib/types'
import { todayIso } from '#/lib/finance'

export type { RecurrenceCadence, TransactionType }

/** ISO date in the current month, at most `daysAgo` back. */
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

function offsetIso(days: number, from = todayIso()) {
  const d = new Date(`${from}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function monthsAgoIso(
  monthsAgo: number,
  dayOfMonth: number,
  from = todayIso(),
) {
  const d = new Date(`${from}T12:00:00`)
  d.setMonth(d.getMonth() - monthsAgo)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(dayOfMonth, lastDay))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export type SampleTransaction = {
  id: string
  description: string
  category: string
  paymentMethod: string
  date: string
  amount: number
  type: TransactionType
}

/** Demo ledger rows for the current month plus prior months. */
export const ledgerTransactions: SampleTransaction[] = [
  // — current month —
  {
    id: '1',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: recentInMonth(0),
    amount: 64.2,
    type: 'expense',
  },
  {
    id: '2',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: recentInMonth(1),
    amount: 4200,
    type: 'income',
  },
  {
    id: '3',
    description: 'Transit pass',
    category: 'Transport',
    paymentMethod: 'Cash',
    date: recentInMonth(1),
    amount: 89,
    type: 'expense',
  },
  {
    id: '4',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: recentInMonth(2),
    amount: 1200,
    type: 'expense',
  },
  {
    id: '5',
    description: 'Pharmacy',
    category: 'Health',
    paymentMethod: 'Debit card',
    date: recentInMonth(2),
    amount: 28.5,
    type: 'expense',
  },
  {
    id: '6',
    description: 'Coffee shop',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: recentInMonth(2),
    amount: 6.75,
    type: 'expense',
  },
  {
    id: '7',
    description: 'Freelance invoice',
    category: 'Income',
    paymentMethod: 'Bank transfer',
    date: recentInMonth(2),
    amount: 350,
    type: 'income',
  },
  {
    id: '8',
    description: 'Streaming',
    category: 'Entertainment',
    paymentMethod: 'Credit card',
    date: recentInMonth(2),
    amount: 15.99,
    type: 'expense',
  },
  {
    id: '9',
    description: 'Gym membership',
    category: 'Health',
    paymentMethod: 'Credit card',
    date: recentInMonth(2),
    amount: 45,
    type: 'expense',
  },
  {
    id: '10',
    description: 'Weekend market',
    category: 'Food',
    paymentMethod: 'Cash',
    date: recentInMonth(2),
    amount: 38.4,
    type: 'expense',
  },
  // — prior months (history for year view) —
  {
    id: 'h1',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: monthsAgoIso(1, 1),
    amount: 4200,
    type: 'income',
  },
  {
    id: 'h2',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(1, 2),
    amount: 1200,
    type: 'expense',
  },
  {
    id: 'h3',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: monthsAgoIso(1, 5),
    amount: 71.1,
    type: 'expense',
  },
  {
    id: 'h4',
    description: 'Electricity',
    category: 'Utilities',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(1, 10),
    amount: 82.3,
    type: 'expense',
  },
  {
    id: 'h5',
    description: 'Streaming',
    category: 'Entertainment',
    paymentMethod: 'Credit card',
    date: monthsAgoIso(1, 12),
    amount: 15.99,
    type: 'expense',
  },
  {
    id: 'h6',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: monthsAgoIso(2, 1),
    amount: 4200,
    type: 'income',
  },
  {
    id: 'h7',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(2, 2),
    amount: 1200,
    type: 'expense',
  },
  {
    id: 'h8',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: monthsAgoIso(2, 6),
    amount: 58.75,
    type: 'expense',
  },
  {
    id: 'h9',
    description: 'Cinema night',
    category: 'Entertainment',
    paymentMethod: 'Cash',
    date: monthsAgoIso(2, 15),
    amount: 24,
    type: 'expense',
  },
  {
    id: 'h10',
    description: 'Internet bill',
    category: 'Utilities',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(2, 18),
    amount: 49.99,
    type: 'expense',
  },
  {
    id: 'h11',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: monthsAgoIso(3, 1),
    amount: 4200,
    type: 'income',
  },
  {
    id: 'h12',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(3, 2),
    amount: 1200,
    type: 'expense',
  },
  {
    id: 'h13',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: monthsAgoIso(3, 7),
    amount: 66.9,
    type: 'expense',
  },
  {
    id: 'h14',
    description: 'Pharmacy',
    category: 'Health',
    paymentMethod: 'Debit card',
    date: monthsAgoIso(3, 20),
    amount: 12.4,
    type: 'expense',
  },
  {
    id: 'h15',
    description: 'Savings deposit',
    category: 'Savings',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(3, 25),
    amount: 300,
    type: 'expense',
  },
  {
    id: 'h16',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: monthsAgoIso(4, 1),
    amount: 4100,
    type: 'income',
  },
  {
    id: 'h17',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(4, 2),
    amount: 1200,
    type: 'expense',
  },
  {
    id: 'h18',
    description: 'Grocery run',
    category: 'Food',
    paymentMethod: 'Debit card',
    date: monthsAgoIso(4, 12),
    amount: 71.2,
    type: 'expense',
  },
  {
    id: 'h19',
    description: 'Monthly salary',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    date: monthsAgoIso(5, 1),
    amount: 4100,
    type: 'income',
  },
  {
    id: 'h20',
    description: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    date: monthsAgoIso(5, 2),
    amount: 1180,
    type: 'expense',
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

export type SampleRecurring = {
  id: string
  name: string
  kind?: 'expense' | 'income'
  category: string
  paymentMethod: string
  amount: number
  cadence: RecurrenceCadence
  nextDate: string
  active: boolean
}

export const recurringExpenses: SampleRecurring[] = [
  {
    id: 'r1',
    name: 'Studio rent',
    category: 'Housing',
    paymentMethod: 'Bank transfer',
    amount: 1200,
    cadence: 'monthly',
    nextDate: offsetIso(0),
    active: true,
  },
  {
    id: 'r2',
    name: 'Transit pass',
    category: 'Transport',
    paymentMethod: 'Debit card',
    amount: 89,
    cadence: 'monthly',
    nextDate: offsetIso(-3),
    active: true,
  },
  {
    id: 'r3',
    name: 'Gym membership',
    category: 'Health',
    paymentMethod: 'Credit card',
    amount: 45,
    cadence: 'monthly',
    nextDate: offsetIso(2),
    active: true,
  },
  {
    id: 'r4',
    name: 'Streaming',
    category: 'Entertainment',
    paymentMethod: 'Credit card',
    amount: 15.99,
    cadence: 'monthly',
    nextDate: offsetIso(4),
    active: true,
  },
  {
    id: 'r5',
    name: 'Cloud backup',
    category: 'Utilities',
    paymentMethod: 'Credit card',
    amount: 2.99,
    cadence: 'monthly',
    nextDate: offsetIso(7),
    active: false,
  },
  {
    id: 'r6',
    name: 'Annual domain',
    category: 'Utilities',
    paymentMethod: 'Debit card',
    amount: 14,
    cadence: 'yearly',
    nextDate: offsetIso(120),
    active: true,
  },
  {
    id: 'r7',
    name: 'Weekly allowance',
    category: 'Food',
    paymentMethod: 'Cash',
    amount: 25,
    cadence: 'weekly',
    nextDate: offsetIso(1),
    active: true,
  },
  {
    id: 'r8',
    name: 'Monthly salary',
    kind: 'income',
    category: 'Income',
    paymentMethod: 'Direct deposit',
    amount: 4200,
    cadence: 'monthly',
    nextDate: offsetIso(26),
    active: true,
  },
]

export const expenseCategories = [
  'Food',
  'Housing',
  'Transport',
  'Health',
  'Utilities',
  'Entertainment',
  'Savings',
  'Other',
] as const

export const sampleMethodLabels = [
  'Debit card',
  'Credit card',
  'Cash',
  'Bank transfer',
  'Direct deposit',
] as const

export const sampleSavingsGoals = [
  {
    name: 'Emergency fund',
    targetAmount: 3000,
    currentAmount: 300,
    targetDate: offsetIso(180),
    category: 'Income',
  },
  {
    name: 'Laptop upgrade',
    targetAmount: 1200,
    currentAmount: 1050,
    targetDate: offsetIso(45),
    category: 'Income',
  },
] as const
