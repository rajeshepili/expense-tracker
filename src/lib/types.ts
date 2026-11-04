export type TransactionType = 'expense' | 'income' | 'transfer'
export type CategoryType = 'expense' | 'income'
export type AccountType = 'asset' | 'liability'
export type TransferDirection = 'out' | 'in'
export type RecurrenceCadence = 'weekly' | 'monthly' | 'yearly'

export type LedgerTransaction = {
  id: string
  description: string
  category: string | null
  categoryId: string | null
  paymentMethod: string | null
  paymentMethodId: string | null
  accountId: string | null
  account: string | null
  sourceRecurringId: string | null
  transferId: string | null
  transferDirection: TransferDirection | null
  date: string
  amount: number
  type: TransactionType
}

export type TransferInput = {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description?: string
}

export type TransferUpdate = Partial<{
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  description: string
}>

export type AccountRow = {
  id: string
  name: string
  type: AccountType
  startingBalance: number
  closed: boolean
  transactionCount: number
  recurringCount: number
  balance: number
}

export type AccountInput = {
  name: string
  type?: AccountType
  startingBalance?: number
}

export type AccountUpdate = Partial<{
  name: string
  type: AccountType
  startingBalance: number
  closed: boolean
}>

export type TransferPair = {
  out: LedgerTransaction
  in: LedgerTransaction
}

export type LedgerSearch = {
  new?: boolean
  edit?: string
  month?: string
  category?: string
  method?: string
  /** Ledger type tab deep-link */
  type?: TransactionType
  q?: string
}

export type RecurringExpenseRow = {
  id: string
  name: string
  kind: 'expense' | 'income'
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
  accountId: string | null
  account: string | null
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
  type: CategoryType
  transactionCount: number
  recurringCount: number
}

/** @deprecated use AccountRow */
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
