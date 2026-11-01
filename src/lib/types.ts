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

export type LedgerSearch = {
  new?: boolean
  edit?: string
  month?: string
  category?: string
  method?: string
  q?: string
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
  budget: number
  currency: string
  seeded: boolean
}

export type MonthBudget = {
  yearMonth: string
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

export type SavingsGoalRow = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  categoryId: string | null
  category: string | null
}

export type SavingsGoalInput = {
  name: string
  targetAmount: number
  currentAmount?: number
  targetDate?: string | null
  categoryId?: string | null
}

export type SavingsGoalUpdate = Partial<{
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  categoryId: string | null
}>
