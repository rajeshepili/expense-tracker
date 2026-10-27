/**
 * Centralized column selection for Drizzle queries.
 * Keeps row shapes consistent across repository functions.
 */

import { transactions, categories, paymentMethods, recurringExpenses, savingsGoals } from '#/db/schema'

/** Transaction with joined category & payment method names. */
export const transactionSelect = {
  id: transactions.id,
  description: transactions.description,
  amount: transactions.amount,
  type: transactions.type,
  date: transactions.transactionDate,
  category: categories.name,
  categoryId: categories.id,
  paymentMethod: paymentMethods.name,
  paymentMethodId: paymentMethods.id,
  sourceRecurringId: transactions.sourceRecurringId,
} as const

/** Recurring bill with joined category & payment method names. */
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
  paymentMethod: paymentMethods.name,
  paymentMethodId: paymentMethods.id,
} as const

/** Savings goal with optional category name. */
export const savingsGoalSelect = {
  id: savingsGoals.id,
  name: savingsGoals.name,
  targetAmount: savingsGoals.targetAmount,
  currentAmount: savingsGoals.currentAmount,
  targetDate: savingsGoals.targetDate,
  categoryId: savingsGoals.categoryId,
  category: categories.name,
} as const