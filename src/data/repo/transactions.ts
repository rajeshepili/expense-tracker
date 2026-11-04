import { eq } from 'drizzle-orm'
import { transactions } from '#/db/schema'
import { RECENT_TRANSACTION_LIMIT } from '#/lib/app-config'
import {
  applyTransactionFilters,
  baseTransactionQuery,
} from '#/data/query-builders'
import { ValidationError } from '#/lib/errors'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { withDb } from '#/data/repo/db'
import { assertAccountOpen } from '#/data/repo/accounts'
import { deleteTransfer } from '#/data/repo/transfers'

export type TransactionInput = {
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: string
  accountId?: string | null
  paymentMethodId?: string | null
  sourceRecurringId?: string | null
}

export type ListTransactionsFilters = {
  /** YYYY-MM, `all`, or omit for every month */
  month?: string
  categoryId?: string
  paymentMethodId?: string
  accountId?: string
  type?: TransactionType
  q?: string
  limit?: number
}

export function transactionValues(input: TransactionInput) {
  if (input.type === 'transfer') {
    throw new ValidationError('Use transfer APIs to create or update transfers')
  }
  if (!input.categoryId) {
    throw new ValidationError('Choose a category')
  }
  const accountId = input.accountId ?? input.paymentMethodId ?? null
  return {
    description: input.description.trim(),
    amount: input.amount,
    type: input.type,
    transactionDate: input.date,
    categoryId: input.categoryId,
    accountId,
    sourceRecurringId: input.sourceRecurringId ?? null,
    transferId: null,
    transferDirection: null,
  }
}

export async function listTransactions(
  filters: ListTransactionsFilters = {},
): Promise<LedgerTransaction[]> {
  return withDb(async (db) => {
    const query = baseTransactionQuery(db)
    const filtered = applyTransactionFilters(query, {
      ...filters,
      accountId: filters.accountId ?? filters.paymentMethodId,
    })
    const rows = filters.limit
      ? await filtered.limit(filters.limit)
      : await filtered
    return rows
  })
}

export async function listRecentTransactions(
  limit = RECENT_TRANSACTION_LIMIT,
): Promise<LedgerTransaction[]> {
  return listTransactions({ limit })
}

/** All transactions, oldest first — for CSV export. */
export async function listAllTransactions(): Promise<LedgerTransaction[]> {
  return listTransactions({ limit: 100_000 })
}

export async function createTransaction(input: TransactionInput) {
  const values = transactionValues(input)
  if (values.accountId) await assertAccountOpen(values.accountId)
  return withDb(async (db) => {
    const [row] = await db
      .insert(transactions)
      .values(values)
      .returning({ id: transactions.id })
    return row
  })
}

export async function updateTransaction(id: string, input: TransactionInput) {
  const values = transactionValues(input)
  if (values.accountId) await assertAccountOpen(values.accountId)
  return withDb(async (db) => {
    const [existing] = await db
      .select({
        type: transactions.type,
        transferId: transactions.transferId,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)
    if (existing?.type === 'transfer' || existing?.transferId) {
      throw new ValidationError('Use transfer APIs to update transfers')
    }
    await db.update(transactions).set(values).where(eq(transactions.id, id))
    return { success: true }
  })
}

export async function deleteTransaction(id: string) {
  return withDb(async (db) => {
    const [existing] = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        transferId: transactions.transferId,
      })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)
    if (!existing) return { success: true }
    if (existing.type === 'transfer' || existing.transferId) {
      return deleteTransfer(id)
    }
    await db.delete(transactions).where(eq(transactions.id, id))
    return { success: true }
  })
}

export async function listTransactionsForRecurring(
  recurringId: string,
): Promise<LedgerTransaction[]> {
  return withDb(async (db) => {
    const rows = await baseTransactionQuery(db)
      .where(eq(transactions.sourceRecurringId, recurringId))
      .execute()
    return rows
  })
}
