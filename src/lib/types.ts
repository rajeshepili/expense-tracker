export type TransactionType = 'expense' | 'income'
export type RecurrenceCadence = 'weekly' | 'monthly' | 'yearly'

export type LedgerTransaction = {
  id: string
  description: string
  category: string
  categoryId: string
  paymentMethod: string | null
  paymentMethodId: string | null
  sourceRecurringId: string | null
  date: string
  amount: number
  type: TransactionType
}

export type RecurringExpenseRow = {
  id: string
  name: string
  category: string
  categoryId: string
  amount: number
  /** null = due equals amount */
  remainingAmount: number | null
  cadence: RecurrenceCadence
  nextDate: string
  active: boolean
  paymentMethod: string | null
  paymentMethodId: string | null
}

export type AppSettings = {
  /** Default monthly budget when no month override exists */
  budget: number
  currency: string
  seeded: boolean
}

export type MonthBudget = {
  yearMonth: string
  /** Effective budget for the month (override or default) */
  budget: number
  defaultBudget: number
  isCustom: boolean
}

export type CategoryRow = {
  id: string
  name: string
  type: TransactionType
  transactionCount: number
  recurringCount: number
}

export type PaymentMethodRow = {
  id: string
  name: string
  transactionCount: number
  recurringCount: number
}
