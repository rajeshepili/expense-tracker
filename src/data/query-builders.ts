import type { Db } from './repository'
import { and, eq, like, desc, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import {
  transactions,
  categories,
  accounts,
  recurringExpenses,
  monthlyBudgets,
  savingsGoals,
} from '#/db/schema'
import { isYearMonth } from '#/lib/finance'
import type { TransactionType } from '#/lib/types'
import { transactionSelect, recurringSelect, savingsGoalSelect } from './selectors'

export type TransactionFilterShape = {
  month?: string
  categoryId?: string
  paymentMethodId?: string
  accountId?: string
  type?: TransactionType
  q?: string
}

export function buildTransactionFilters(
  filters: TransactionFilterShape = {},
): SQL[] {
  const conditions: SQL[] = []

  if (filters.month && filters.month !== 'all' && isYearMonth(filters.month)) {
    conditions.push(like(transactions.transactionDate, `${filters.month}%`))
  }
  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId))
  }
  const accountFilter = filters.accountId ?? filters.paymentMethodId
  if (accountFilter) {
    conditions.push(eq(transactions.accountId, accountFilter))
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type))
  }
  const needle = filters.q?.trim().toLowerCase()
  if (needle) {
    const pattern = `%${needle}%`
    conditions.push(
      sql`(lower(${transactions.description}) like ${pattern} or lower(coalesce(${categories.name}, '')) like ${pattern} or lower(coalesce(${accounts.name}, '')) like ${pattern})`,
    )
  }
  return conditions
}

export function baseTransactionQuery(db: Db) {
  return db
    .select(transactionSelect)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}

export function applyTransactionFilters(
  query: ReturnType<typeof baseTransactionQuery>,
  filters: TransactionFilterShape = {},
) {
  const conditions = buildTransactionFilters(filters)
  return conditions.length > 0 ? query.where(and(...conditions)) : query
}

export function baseRecurringQuery(db: Db) {
  return db
    .select(recurringSelect)
    .from(recurringExpenses)
    .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
    .leftJoin(accounts, eq(recurringExpenses.accountId, accounts.id))
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
