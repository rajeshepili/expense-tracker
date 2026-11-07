import { and, count, eq, lte } from 'drizzle-orm'
import { accounts, recurringExpenses, transactions } from '#/db/schema'
import { accountDeltasQuery } from '#/data/query-builders'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '#/lib/errors'
import {
  accountBalance,
  inferAccountTypeFromName,
  MONEY_EPSILON,
} from '#/lib/finance'
import type {
  AccountInput,
  AccountRow,
  AccountType,
  AccountUpdate,
  PaymentMethodRow,
} from '#/lib/types'
import { withDb } from '#/data/repo/db'
import type { Db } from '#/data/repo/db'

async function usageCounts(db: Db, accountId: string) {
  const [txRow] = await db
    .select({ value: count() })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
  const [recRow] = await db
    .select({ value: count() })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.accountId, accountId))
  return {
    transactionCount: txRow?.value ?? 0,
    recurringCount: recRow?.value ?? 0,
  }
}

async function loadAccountOrThrow(db: Db, id: string) {
  const [row] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  if (!row) throw new NotFoundError('Account')
  return row
}

export async function assertAccountOpen(id: string) {
  return withDb(async (db) => {
    const row = await loadAccountOrThrow(db, id)
    if (row.closed) {
      throw new ValidationError(`Account “${row.name}” is closed`)
    }
    return row
  })
}

export async function listAccounts() {
  return withDb((db) => db.select().from(accounts).orderBy(accounts.name))
}

export async function getAccount(id: string) {
  return withDb((db) => loadAccountOrThrow(db, id))
}

export async function getAccountBalance(id: string, asOfDate?: string) {
  return withDb(async (db) => {
    const row = await loadAccountOrThrow(db, id)
    const conditions = [eq(transactions.accountId, id)]
    if (asOfDate) conditions.push(lte(transactions.transactionDate, asOfDate))
    const rows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        transferDirection: transactions.transferDirection,
      })
      .from(transactions)
      .where(and(...conditions))
    return accountBalance(
      row.startingBalance,
      rows.map((item) => ({
        type: item.type,
        amount: item.amount,
        transferDirection: item.transferDirection,
      })),
      row.type,
    )
  })
}

export async function listAccountsWithBalances(): Promise<AccountRow[]> {
  return withDb(async (db) => {
    const [rows, txCounts, recCounts, deltas] = await Promise.all([
      db.select().from(accounts).orderBy(accounts.name),
      db
        .select({
          accountId: transactions.accountId,
          value: count(),
        })
        .from(transactions)
        .groupBy(transactions.accountId),
      db
        .select({
          accountId: recurringExpenses.accountId,
          value: count(),
        })
        .from(recurringExpenses)
        .groupBy(recurringExpenses.accountId),
      accountDeltasQuery(db),
    ])

    const txByAccount = new Map(
      txCounts
        .filter((row) => row.accountId)
        .map((row) => [row.accountId!, row.value ?? 0]),
    )
    const recByAccount = new Map(
      recCounts
        .filter((row) => row.accountId)
        .map((row) => [row.accountId!, row.value ?? 0]),
    )
    const deltaByAccount = new Map(
      deltas
        .filter((row) => row.accountId)
        .map((row) => [row.accountId!, row.delta ?? 0]),
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      startingBalance: row.startingBalance,
      closed: row.closed,
      transactionCount: txByAccount.get(row.id) ?? 0,
      recurringCount: recByAccount.get(row.id) ?? 0,
      balance: row.startingBalance + (deltaByAccount.get(row.id) ?? 0),
    }))
  })
}

export async function createAccount(input: AccountInput) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new ValidationError('Enter an account name')
    const existing = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.name, name))
      .limit(1)
    if (existing[0]) throw new ConflictError(`“${name}” already exists`)
    const type = input.type ?? inferAccountTypeFromName(name)
    const startingBalance = input.startingBalance ?? 0
    if (!Number.isFinite(startingBalance)) {
      throw new ValidationError('Starting balance must be a number')
    }
    const [row] = await db
      .insert(accounts)
      .values({ name, type, startingBalance })
      .returning({ id: accounts.id })
    return row
  })
}

export async function updateAccount(id: string, patch: AccountUpdate) {
  return withDb(async (db) => {
    const row = await loadAccountOrThrow(db, id)
    const next: {
      name?: string
      type?: AccountType
      startingBalance?: number
      closed?: boolean
    } = {}

    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) throw new ValidationError('Enter an account name')
      const duplicate = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.name, name))
        .limit(1)
      if (duplicate[0] && duplicate[0].id !== id) {
        throw new ConflictError(`“${name}” already exists`)
      }
      next.name = name
    }

    if (patch.startingBalance !== undefined) {
      if (!Number.isFinite(patch.startingBalance)) {
        throw new ValidationError('Starting balance must be a number')
      }
      next.startingBalance = patch.startingBalance
    }

    if (patch.closed !== undefined) {
      next.closed = patch.closed
    }

    if (patch.type !== undefined && patch.type !== row.type) {
      const usage = await usageCounts(db, id)
      if (usage.transactionCount > 0 || usage.recurringCount > 0) {
        throw new ConflictError(
          'Cannot change account type while it has transactions or recurring bills',
        )
      }
      next.type = patch.type
    }

    if (Object.keys(next).length === 0) return { success: true as const }
    await db.update(accounts).set(next).where(eq(accounts.id, id))
    return { success: true as const }
  })
}

export async function closeAccount(id: string) {
  return withDb(async (db) => {
    const row = await loadAccountOrThrow(db, id)
    if (row.closed) return { success: true as const }
    const txRows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        transferDirection: transactions.transferDirection,
      })
      .from(transactions)
      .where(eq(transactions.accountId, id))
    const balance = accountBalance(
      row.startingBalance,
      txRows.map((item) => ({
        type: item.type,
        amount: item.amount,
        transferDirection: item.transferDirection,
      })),
      row.type,
    )
    if (Math.abs(balance) > MONEY_EPSILON) {
      throw new ConflictError(
        `Account “${row.name}” still has a balance of ${balance}. Move or adjust it to zero before closing.`,
      )
    }
    await db.update(accounts).set({ closed: true }).where(eq(accounts.id, id))
    return { success: true as const }
  })
}

export async function deleteAccount(id: string) {
  return withDb(async (db) => {
    const row = await loadAccountOrThrow(db, id)
    const usage = await usageCounts(db, id)
    if (usage.transactionCount > 0 || usage.recurringCount > 0) {
      throw new ConflictError(
        `Account “${row.name}” is still used by transactions or recurring bills`,
      )
    }
    const balance = accountBalance(row.startingBalance, [], row.type)
    if (!row.closed && Math.abs(balance) > MONEY_EPSILON) {
      throw new ConflictError(
        `Account “${row.name}” still has a balance of ${balance}`,
      )
    }
    await db.delete(accounts).where(eq(accounts.id, id))
    return { success: true as const }
  })
}

/** @deprecated */
export async function listPaymentMethods() {
  return listAccounts()
}

/** @deprecated */
export async function listPaymentMethodsWithUsage(): Promise<PaymentMethodRow[]> {
  const rows = await listAccountsWithBalances()
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    transactionCount: row.transactionCount,
    recurringCount: row.recurringCount,
  }))
}

/** @deprecated */
export async function createPaymentMethod(input: { name: string }) {
  return createAccount({
    name: input.name,
    type: inferAccountTypeFromName(input.name.trim()),
  })
}

/** @deprecated */
export async function updatePaymentMethod(id: string, input: { name: string }) {
  return updateAccount(id, { name: input.name })
}

/** @deprecated */
export async function deletePaymentMethod(id: string) {
  return deleteAccount(id)
}
