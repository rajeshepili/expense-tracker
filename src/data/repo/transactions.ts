import { and, eq, sql } from 'drizzle-orm'
import { accounts, categories, transactions } from '#/db/schema'
import {
  LEDGER_PAGE_SIZE,
  RECURRING_PAYMENT_HISTORY_LIMIT,
} from '#/lib/app-config'
import {
  applyTransactionFilters,
  buildTransactionFilters,
  baseTransactionQuery,
} from '#/data/query-builders'
import { ValidationError } from '#/lib/errors'
import type { LedgerTransaction, TransactionType } from '#/lib/types'
import { withDb } from '#/data/repo/db'
import { assertAccountOpen } from '#/data/repo/accounts'
import { deleteTransfer } from '#/data/repo/transfers'

type TransactionInput = {
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
  /** YYYY-MM preferred; `all` is rejected by the ledger UI */
  month?: string
  categoryId?: string
  paymentMethodId?: string
  accountId?: string
  type?: TransactionType
  q?: string
  limit?: number
  offset?: number
}

type TransactionTotals = {
  income: number
  expenses: number
  count: number
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
    const limit = filters.limit ?? LEDGER_PAGE_SIZE
    const offset = filters.offset ?? 0
    return filtered.limit(limit).offset(offset)
  })
}

/** Totals for the current filters (ignores list limit/offset). */
export async function summarizeTransactions(
  filters: ListTransactionsFilters = {},
): Promise<TransactionTotals> {
  return withDb(async (db) => {
    const accountId = filters.accountId ?? filters.paymentMethodId
    const conditions = buildTransactionFilters({
      ...filters,
      accountId,
    })
    // Search joins category/account names — mirror list filter joins.
    const needsJoin = Boolean(filters.q?.trim())
    const base = db
      .select({
        income:
          sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`.mapWith(
            Number,
          ),
        expenses:
          sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`.mapWith(
            Number,
          ),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(transactions)
    const joined = needsJoin
      ? base
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      : base
    const rows =
      conditions.length > 0
        ? await joined.where(and(...conditions))
        : await joined
    return {
      income: rows[0]?.income ?? 0,
      expenses: rows[0]?.expenses ?? 0,
      count: rows[0]?.count ?? 0,
    }
  })
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
    const updated = await db
      .update(transactions)
      .set(values)
      .where(eq(transactions.id, id))
      .returning({ id: transactions.id })
    if (updated.length === 0) {
      throw new ValidationError('Transaction not found')
    }
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
  limit = RECURRING_PAYMENT_HISTORY_LIMIT,
): Promise<LedgerTransaction[]> {
  return withDb(async (db) => {
    return baseTransactionQuery(db)
      .where(eq(transactions.sourceRecurringId, recurringId))
      .limit(limit)
  })
}
