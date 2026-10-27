import { count, eq } from 'drizzle-orm'
import { paymentMethods, recurringExpenses, transactions } from '#/db/schema'
import { ConflictError, ValidationError } from '#/lib/errors'
import type { PaymentMethodRow } from '#/lib/types'
import { withDb } from '#/data/repo/db'

export async function listPaymentMethods() {
  return withDb((db) =>
    db.select().from(paymentMethods).orderBy(paymentMethods.name),
  )
}

export async function listPaymentMethodsWithUsage(): Promise<
  PaymentMethodRow[]
> {
  return withDb(async (db) => {
    const [rows, txCounts, recCounts] = await Promise.all([
      db.select().from(paymentMethods).orderBy(paymentMethods.name),
      db
        .select({
          paymentMethodId: transactions.paymentMethodId,
          value: count(),
        })
        .from(transactions)
        .groupBy(transactions.paymentMethodId),
      db
        .select({
          paymentMethodId: recurringExpenses.paymentMethodId,
          value: count(),
        })
        .from(recurringExpenses)
        .groupBy(recurringExpenses.paymentMethodId),
    ])
    const byMethod = new Map(
      txCounts
        .filter((row) => row.paymentMethodId)
        .map((row) => [row.paymentMethodId!, row.value ?? 0]),
    )
    const byRecMethod = new Map(
      recCounts
        .filter((row) => row.paymentMethodId)
        .map((row) => [row.paymentMethodId!, row.value ?? 0]),
    )
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      transactionCount: byMethod.get(row.id) ?? 0,
      recurringCount: byRecMethod.get(row.id) ?? 0,
    }))
  })
}

export async function createPaymentMethod(input: { name: string }) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new ValidationError('Enter a payment method name')
    const existing = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.name, name))
      .limit(1)
    if (existing[0]) throw new ConflictError(`“${name}” already exists`)
    const [row] = await db
      .insert(paymentMethods)
      .values({ name })
      .returning({ id: paymentMethods.id })
    return row
  })
}

export async function updatePaymentMethod(id: string, input: { name: string }) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new ValidationError('Enter a payment method name')
    const duplicate = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.name, name))
      .limit(1)
    if (duplicate[0] && duplicate[0].id !== id) {
      throw new ConflictError(`“${name}” already exists`)
    }
    await db
      .update(paymentMethods)
      .set({ name })
      .where(eq(paymentMethods.id, id))
    return { success: true as const }
  })
}

export async function deletePaymentMethod(id: string) {
  return withDb(async (db) => {
    const [{ value: used }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.paymentMethodId, id))
    if ((used ?? 0) > 0) {
      await db
        .update(transactions)
        .set({ paymentMethodId: null })
        .where(eq(transactions.paymentMethodId, id))
    }
    const [{ value: recUsed }] = await db
      .select({ value: count() })
      .from(recurringExpenses)
      .where(eq(recurringExpenses.paymentMethodId, id))
    if ((recUsed ?? 0) > 0) {
      await db
        .update(recurringExpenses)
        .set({ paymentMethodId: null })
        .where(eq(recurringExpenses.paymentMethodId, id))
    }
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id))
    return {
      success: true as const,
      clearedFromTransactions: used ?? 0,
      clearedFromRecurring: recUsed ?? 0,
    }
  })
}
