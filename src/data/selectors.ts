import { transactions, categories, accounts, recurringExpenses, savingsGoals } from '#/db/schema'

export const transactionSelect = {
  id: transactions.id,
  description: transactions.description,
  amount: transactions.amount,
  type: transactions.type,
  date: transactions.transactionDate,
  category: categories.name,
  categoryId: transactions.categoryId,
  paymentMethod: accounts.name,
  paymentMethodId: transactions.accountId,
  accountId: transactions.accountId,
  account: accounts.name,
  sourceRecurringId: transactions.sourceRecurringId,
  transferId: transactions.transferId,
  transferDirection: transactions.transferDirection,
} as const

export const recurringSelect = {
  id: recurringExpenses.id,
  name: recurringExpenses.name,
  amount: recurringExpenses.amount,
  remainingAmount: recurringExpenses.remainingAmount,
  cadence: recurringExpenses.cadence,
  nextDate: recurringExpenses.nextDate,
  active: recurringExpenses.active,
  category: categories.name,
  categoryId: categories.id,
  paymentMethod: accounts.name,
  paymentMethodId: recurringExpenses.accountId,
  accountId: recurringExpenses.accountId,
  account: accounts.name,
} as const

export const savingsGoalSelect = {
  id: savingsGoals.id,
  name: savingsGoals.name,
  targetAmount: savingsGoals.targetAmount,
  currentAmount: savingsGoals.currentAmount,
  targetDate: savingsGoals.targetDate,
  categoryId: savingsGoals.categoryId,
  category: categories.name,
} as const
