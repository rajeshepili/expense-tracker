import { desc, eq } from 'drizzle-orm'
import { recurringExpenses, transactions } from '#/db/schema'
import { baseRecurringQuery } from '#/data/query-builders'
import {
  advanceRecurringDate,
  amountDue,
  defaultRecordDate,
  settleRecurringPayment,
  skipRecurringPatch,
  todayIso,
} from '#/lib/finance'
import { NotFoundError, ValidationError } from '#/lib/errors'
import type { RecurrenceCadence, RecurringExpenseRow } from '#/lib/types'
import { withDb } from '#/data/repo/db'
import type { Db } from '#/data/repo/db'
import { transactionValues } from '#/data/repo/transactions'

export type RecordRecurringOverrides = {
  amount?: number
  date?: string
  paymentMethodId?: string | null
  force?: boolean
}

export type RecordRecurringResult =
  | {
      ok: true
      transactionId: string
      nextDate: string
      alreadyRecorded: boolean
      partial: boolean
      remainingAmount: number | null
    }
  | { ok: false; reason: 'already_recorded'; nextDate: string }

type RecurringInput = {
  name: string
  kind: 'expense' | 'income'
  amount: number
  cadence: RecurrenceCadence
  nextDate: string
  categoryId: string
  paymentMethodId?: string | null
  active: boolean
}

function recurringValues(input: RecurringInput) {
  return {
    name: input.name.trim(),
    kind: input.kind,
    amount: input.amount,
    cadence: input.cadence,
    nextDate: input.nextDate,
    categoryId: input.categoryId,
    accountId: input.paymentMethodId ?? null,
    active: input.active,
  }
}

function recurringQuery(db: Db) {
  return baseRecurringQuery(db)
}

export async function listRecurring(): Promise<RecurringExpenseRow[]> {
  return withDb(async (db) =>
    recurringQuery(db).orderBy(recurringExpenses.nextDate),
  )
}

export async function createRecurring(
  input: Omit<RecurringInput, 'active'> & { active?: boolean },
) {
  return withDb(async (db) => {
    const [row] = await db
      .insert(recurringExpenses)
      .values(recurringValues({ ...input, active: input.active ?? true }))
      .returning({ id: recurringExpenses.id })
    return row
  })
}

export async function updateRecurring(id: string, input: RecurringInput) {
  return withDb(async (db) => {
    await db
      .update(recurringExpenses)
      .set(recurringValues(input))
      .where(eq(recurringExpenses.id, id))
    return { success: true }
  })
}

export async function setRecurringActive(id: string, active: boolean) {
  return withDb(async (db) => {
    await db
      .update(recurringExpenses)
      .set({ active })
      .where(eq(recurringExpenses.id, id))
    return { success: true }
  })
}

export async function deleteRecurring(id: string) {
  return withDb(async (db) => {
    await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id))
    return { success: true }
  })
}

export async function recordRecurringPayment(
  id: string,
  overrides: RecordRecurringOverrides = {},
): Promise<RecordRecurringResult> {
  return withDb(async (db) => {
    const [bill] = await recurringQuery(db)
      .where(eq(recurringExpenses.id, id))
      .limit(1)
    if (!bill) throw new NotFoundError('Recurring bill')
    if (!bill.active) throw new ValidationError('This bill is paused')

    const today = todayIso()
    const recordDate = overrides.date ?? defaultRecordDate(bill.nextDate, today)
    const due = amountDue(bill)
    const amount = overrides.amount ?? due
    if (!Number.isFinite(amount) || amount < 0) {
      throw new ValidationError('Enter a valid amount (0 or more)')
    }

    const priorLinked = await db
      .select({
        id: transactions.id,
        date: transactions.transactionDate,
      })
      .from(transactions)
      .where(eq(transactions.sourceRecurringId, id))
      .orderBy(desc(transactions.transactionDate))
      .limit(1)

    const hasPaymentThisCycle = Boolean(
      priorLinked[0] && priorLinked[0].date >= bill.nextDate,
    )
    const cycleOpen =
      bill.remainingAmount !== null && bill.remainingAmount > 0
    const alreadyRecorded = hasPaymentThisCycle && !cycleOpen
    if (alreadyRecorded && !overrides.force) {
      return {
        ok: false,
        reason: 'already_recorded',
        nextDate: bill.nextDate,
      }
    }

    const settlement = settleRecurringPayment(due, amount)
    const [tx] = await db
      .insert(transactions)
      .values(
        transactionValues({
          description: bill.name,
          amount,
          type: bill.kind,
          date: recordDate,
          categoryId: bill.categoryId,
          accountId:
            overrides.paymentMethodId !== undefined
              ? overrides.paymentMethodId
              : bill.accountId,
          sourceRecurringId: id,
        }),
      )
      .returning({ id: transactions.id })

    if (settlement.kind === 'partial') {
      await db
        .update(recurringExpenses)
        .set({ remainingAmount: settlement.remaining })
        .where(eq(recurringExpenses.id, id))

      return {
        ok: true,
        transactionId: tx.id,
        nextDate: bill.nextDate,
        alreadyRecorded: false,
        partial: true,
        remainingAmount: settlement.remaining,
      }
    }

    const nextDate = advanceRecurringDate(recordDate, bill.cadence)
    await db
      .update(recurringExpenses)
      .set({ nextDate, remainingAmount: null })
      .where(eq(recurringExpenses.id, id))

    return {
      ok: true,
      transactionId: tx.id,
      nextDate,
      alreadyRecorded: false,
      partial: false,
      remainingAmount: null,
    }
  })
}

export async function skipRecurringOccurrence(id: string) {
  return withDb(async (db) => {
    const [bill] = await db
      .select()
      .from(recurringExpenses)
      .where(eq(recurringExpenses.id, id))
      .limit(1)
    if (!bill) throw new NotFoundError('Recurring bill')
    const patch = skipRecurringPatch(bill)
    await db
      .update(recurringExpenses)
      .set(patch)
      .where(eq(recurringExpenses.id, id))
    return { nextDate: patch.nextDate }
  })
}

export { recurringQuery }
