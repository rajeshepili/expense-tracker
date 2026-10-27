import { eq } from 'drizzle-orm'
import { transactions } from '#/db/schema'
import { RECENT_TRANSACTION_LIMIT } from '#/lib/app-config'
import {
  applyTransactionFilters,
  baseTransactionQuery,
} from '#/data/query-builders'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { withDb } from '#/data/repo/db'

export type TransactionInput = {
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: string
  paymentMethodId?: string | null
  sourceRecurringId?: string | null
}

export type ListTransactionsFilters = {
  /** YYYY-MM, `all`, or omit for every month */
  month?: string
  categoryId?: string
  paymentMethodId?: string
  type?: TransactionType
  q?: string
  limit?: number
}

export function transactionValues(input: TransactionInput) {
  return {
    description: input.description.trim(),
    amount: input.amount,
    type: input.type,
    transactionDate: input.date,
    categoryId: input.categoryId,
    paymentMethodId: input.paymentMethodId ?? null,
    sourceRecurringId: input.sourceRecurringId ?? null,
  }
}

export async function listTransactions(
  filters: ListTransactionsFilters = {},
): Promise<LedgerTransaction[]> {
  return withDb(async (db) => {
    const query = baseTransactionQuery(db)
    const filtered = applyTransactionFilters(query, filters)
    return filters.limit ? filtered.limit(filters.limit) : filtered
  })
}

export async function listRecentTransactions(
  limit = RECENT_TRANSACTION_LIMIT,
): Promise<LedgerTransaction[]> {
  return listTransactions({ limit })
}

export async function createTransaction(input: TransactionInput) {
  return withDb(async (db) => {
    const [row] = await db
      .insert(transactions)
      .values(transactionValues(input))
      .returning({ id: transactions.id })
    return row
  })
}

export async function updateTransaction(id: string, input: TransactionInput) {
  return withDb(async (db) => {
    await db
      .update(transactions)
      .set(transactionValues(input))
      .where(eq(transactions.id, id))
    return { success: true }
  })
}

export async function deleteTransaction(id: string) {
  return withDb(async (db) => {
    await db.delete(transactions).where(eq(transactions.id, id))
    return { success: true }
  })
}

export async function listTransactionsForRecurring(
  recurringId: string,
): Promise<LedgerTransaction[]> {
  return withDb(async (db) =>
    baseTransactionQuery(db)
      .where(eq(transactions.sourceRecurringId, recurringId))
      .execute(),
  )
}
