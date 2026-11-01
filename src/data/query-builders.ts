
import type { Db } from './repository'
import { and, eq, like, desc, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import {
  transactions,
  categories,
  paymentMethods,
  recurringExpenses,
  monthlyBudgets,
  savingsGoals,
} from '#/db/schema'
import { isYearMonth } from '#/lib/finance'
import { transactionSelect, recurringSelect, savingsGoalSelect } from './selectors'

export function buildTransactionFilters(
  filters: {
    month?: string
    categoryId?: string
    paymentMethodId?: string
    type?: 'income' | 'expense'
    q?: string
  } = {},
): SQL[] {
  const conditions: SQL[] = []

  if (filters.month && filters.month !== 'all' && isYearMonth(filters.month)) {
    conditions.push(like(transactions.transactionDate, `${filters.month}%`))
  }
  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId))
  }
  if (filters.paymentMethodId) {
    conditions.push(eq(transactions.paymentMethodId, filters.paymentMethodId))
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type))
  }
  const needle = filters.q?.trim().toLowerCase()
  if (needle) {
    const pattern = `%${needle}%`
    conditions.push(
      sql`(lower(${transactions.description}) like ${pattern} or lower(${categories.name}) like ${pattern} or lower(coalesce(${paymentMethods.name}, '')) like ${pattern})`,
    )
  }
  return conditions
}

export function baseTransactionQuery(db: Db) {
  return db
    .select(transactionSelect)
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}

export function applyTransactionFilters(
  query: ReturnType<typeof baseTransactionQuery>,
  filters: { month?: string; categoryId?: string; paymentMethodId?: string; type?: 'income' | 'expense'; q?: string } = {},
) {
  const conditions = buildTransactionFilters(filters)
  return conditions.length > 0 ? query.where(and(...conditions)) : query
}

export function baseRecurringQuery(db: Db) {
  return db
    .select(recurringSelect)
    .from(recurringExpenses)
    .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
    .leftJoin(paymentMethods, eq(recurringExpenses.paymentMethodId, paymentMethods.id))
}

export function baseSavingsGoalQuery(db: Db) {
  return db
    .select(savingsGoalSelect)
    .from(savingsGoals)
    .leftJoin(categories, eq(savingsGoals.categoryId, categories.id))
}

export function monthBudgetQuery(db: Db, yearMonth: string) {
  return db
    .select()
    .from(monthlyBudgets)
    .where(eq(monthlyBudgets.yearMonth, yearMonth))
}

export function buildTextSearch(
  needle: string,
  columns: { table: any; column: any }[],
) {
  const pattern = `%${needle.toLowerCase()}%`
  return sql`(${sql.join(
    columns.map(({ table, column }) => sql`lower(${table}.${column}) like ${pattern}`),
    sql` or `,
  )})`
}