import { and, count, desc, eq, like, sql } from 'drizzle-orm'
import { ensureDatabase, getDb } from '#/db/index'
import {
  categories,
  monthlyBudgets,
  paymentMethods,
  recurringExpenses,
  settings,
  transactions,
} from '#/db/schema'
import {
  completeOnboarding as completeOnboardingSeed,
  ensureSettingsRow,
  needsOnboarding
  
} from '#/data/seed'
import type {OnboardingInput} from '#/data/seed';
import {
  DUE_RECURRING_LIMIT,
  RECENT_TRANSACTION_LIMIT,
  UPCOMING_RECURRING_LIMIT,
} from '#/lib/app-config'
import {
  advanceRecurringDate,
  amountDue,
  categoryBudgetBreakdown,
  currentYearMonth,
  defaultRecordDate,
  dueStatus,
  isYearMonth,
  monthlyEquivalent,
  resolveMonthBudget,
  settleRecurringPayment,
  shiftYearMonth,
  todayIso,
} from '#/lib/finance'
import type {
  AppSettings,
  CategoryRow,
  LedgerTransaction,
  MonthBudget,
  PaymentMethodRow,
  RecurrenceCadence,
  RecurringExpenseRow,
  TransactionType,
} from '#/lib/types'

type Db = Awaited<ReturnType<typeof getDb>>

type TransactionInput = {
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: string
  paymentMethodId?: string | null
  sourceRecurringId?: string | null
}

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
  amount: number
  cadence: RecurrenceCadence
  nextDate: string
  categoryId: string
  paymentMethodId?: string | null
  active: boolean
}

const transactionColumns = {
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
}

const recurringColumns = {
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
}

let bootstrapped: Promise<{ needsOnboarding: boolean }> | null = null

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  await bootstrapDatabase()
  return fn(await getDb())
}

function transactionValues(input: TransactionInput) {
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

function recurringValues(input: RecurringInput) {
  return {
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    nextDate: input.nextDate,
    categoryId: input.categoryId,
    paymentMethodId: input.paymentMethodId ?? null,
    active: input.active,
  }
}

function transactionsQuery(db: Db) {
  return db
    .select(transactionColumns)
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(
      paymentMethods,
      eq(transactions.paymentMethodId, paymentMethods.id),
    )
    .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
}

function recurringQuery(db: Db) {
  return db
    .select(recurringColumns)
    .from(recurringExpenses)
    .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
    .leftJoin(
      paymentMethods,
      eq(recurringExpenses.paymentMethodId, paymentMethods.id),
    )
}

export async function bootstrapApp() {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      await ensureDatabase()
      const needs = await needsOnboarding()
      return { needsOnboarding: needs }
    })()
    bootstrapped.catch(() => {
      bootstrapped = null
    })
  }
  return bootstrapped
}

export async function bootstrapDatabase() {
  await bootstrapApp()
}

export async function getSettings(): Promise<AppSettings> {
  await bootstrapDatabase()
  const row = await ensureSettingsRow()
  return {
    budget: row.budget,
    currency: row.currency,
    seeded: Boolean(row.seededAt),
  }
}

export async function completeOnboarding(input: OnboardingInput) {
  await bootstrapDatabase()
  const result = await completeOnboardingSeed(input)
  bootstrapped = Promise.resolve({ needsOnboarding: false })
  return result
}

export async function updateSettings(patch: {
  budget?: number
  currency?: string
}) {
  return withDb(async (db) => {
    const next: { budget?: number; currency?: string } = {}
    if (patch.budget !== undefined) next.budget = patch.budget
    if (patch.currency !== undefined) next.currency = patch.currency
    if (Object.keys(next).length === 0) return getSettings()
    await db.update(settings).set(next).where(eq(settings.id, 'default'))
    return getSettings()
  })
}

export async function getMonthBudget(
  yearMonth = currentYearMonth(),
): Promise<MonthBudget> {
  return withDb(async (db) => {
    const [settingsRow] = await db
      .select({ budget: settings.budget })
      .from(settings)
      .where(eq(settings.id, 'default'))
      .limit(1)
    const defaultBudget = settingsRow?.budget ?? 2500
    const [override] = await db
      .select({ budget: monthlyBudgets.budget })
      .from(monthlyBudgets)
      .where(eq(monthlyBudgets.yearMonth, yearMonth))
      .limit(1)
    return resolveMonthBudget(yearMonth, defaultBudget, override?.budget)
  })
}

export async function setMonthBudget(yearMonth: string, budget: number) {
  return withDb(async (db) => {
    await db
      .insert(monthlyBudgets)
      .values({ yearMonth, budget })
      .onConflictDoUpdate({
        target: monthlyBudgets.yearMonth,
        set: { budget },
      })
    return getMonthBudget(yearMonth)
  })
}

export async function clearMonthBudget(yearMonth: string) {
  return withDb(async (db) => {
    await db
      .delete(monthlyBudgets)
      .where(eq(monthlyBudgets.yearMonth, yearMonth))
    return getMonthBudget(yearMonth)
  })
}

export async function listCategories() {
  return withDb((db) => db.select().from(categories).orderBy(categories.name))
}

export async function listCategoriesWithUsage(): Promise<CategoryRow[]> {
  return withDb(async (db) => {
    const [rows, txCounts, recCounts] = await Promise.all([
      db.select().from(categories).orderBy(categories.name),
      db
        .select({
          categoryId: transactions.categoryId,
          value: count(),
        })
        .from(transactions)
        .groupBy(transactions.categoryId),
      db
        .select({
          categoryId: recurringExpenses.categoryId,
          value: count(),
        })
        .from(recurringExpenses)
        .groupBy(recurringExpenses.categoryId),
    ])

    const txByCategory = new Map(
      txCounts.map((row) => [row.categoryId, row.value ?? 0]),
    )
    const recByCategory = new Map(
      recCounts.map((row) => [row.categoryId, row.value ?? 0]),
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      transactionCount: txByCategory.get(row.id) ?? 0,
      recurringCount: recByCategory.get(row.id) ?? 0,
    }))
  })
}

export async function createCategory(input: {
  name: string
  type: TransactionType
}) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new Error('Enter a category name')

    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.type, input.type)))
      .limit(1)
    if (existing[0]) {
      throw new Error(`“${name}” already exists for ${input.type}`)
    }

    const [row] = await db
      .insert(categories)
      .values({ name, type: input.type })
      .returning({ id: categories.id })
    return row
  })
}

export async function updateCategory(
  id: string,
  input: { name: string; type: TransactionType },
) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new Error('Enter a category name')

    const duplicate = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.type, input.type)))
      .limit(1)
    if (duplicate[0] && duplicate[0].id !== id) {
      throw new Error(`“${name}” already exists for ${input.type}`)
    }

    await db
      .update(categories)
      .set({ name, type: input.type })
      .where(eq(categories.id, id))
    return { success: true }
  })
}

export async function deleteCategory(
  id: string,
  options?: { replacementCategoryId?: string },
) {
  return withDb(async (db) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)
    if (!category) throw new Error('Category not found')

    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
    const [{ value: recurringCount }] = await db
      .select({ value: count() })
      .from(recurringExpenses)
      .where(eq(recurringExpenses.categoryId, id))

    const usedBy = (transactionCount ?? 0) + (recurringCount ?? 0)
    if (usedBy > 0) {
      const replacementId = options?.replacementCategoryId
      if (!replacementId) {
        throw new Error(
          'Choose another category to move existing transactions and recurring items into.',
        )
      }
      if (replacementId === id) {
        throw new Error('Choose a different category as the replacement.')
      }

      const [replacement] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, replacementId))
        .limit(1)
      if (!replacement) throw new Error('Replacement category not found')
      if (replacement.type !== category.type) {
        throw new Error(
          `Replacement must also be an ${category.type} category.`,
        )
      }

      await db
        .update(transactions)
        .set({ categoryId: replacementId })
        .where(eq(transactions.categoryId, id))
      await db
        .update(recurringExpenses)
        .set({ categoryId: replacementId })
        .where(eq(recurringExpenses.categoryId, id))
    }

    await db.delete(categories).where(eq(categories.id, id))
    return { success: true }
  })
}

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
    if (!name) throw new Error('Enter a payment method name')
    const existing = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.name, name))
      .limit(1)
    if (existing[0]) throw new Error(`“${name}” already exists`)
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
    if (!name) throw new Error('Enter a payment method name')
    const duplicate = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(eq(paymentMethods.name, name))
      .limit(1)
    if (duplicate[0] && duplicate[0].id !== id) {
      throw new Error(`“${name}” already exists`)
    }
    await db
      .update(paymentMethods)
      .set({ name })
      .where(eq(paymentMethods.id, id))
    return { success: true }
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
      success: true,
      clearedFromTransactions: used ?? 0,
      clearedFromRecurring: recUsed ?? 0,
    }
  })
}

export async function listTransactions(): Promise<LedgerTransaction[]> {
  return withDb(async (db) => transactionsQuery(db))
}

export async function listRecentTransactions(limit = RECENT_TRANSACTION_LIMIT): Promise<LedgerTransaction[]> {
  return withDb(async (db) =>
    transactionsQuery(db).limit(limit),
  )
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
    if (!bill) throw new Error('Recurring bill not found')
    if (!bill.active) throw new Error('This bill is paused')

    const today = todayIso()
    const recordDate = overrides.date ?? defaultRecordDate(bill.nextDate, today)
    const due = amountDue(bill)
    const amount = overrides.amount ?? due
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Enter a valid amount (0 or more)')
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
          type: 'expense',
          date: recordDate,
          categoryId: bill.categoryId,
          paymentMethodId:
            overrides.paymentMethodId !== undefined
              ? overrides.paymentMethodId
              : bill.paymentMethodId,
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
    if (!bill) throw new Error('Recurring bill not found')
    const nextDate = advanceRecurringDate(bill.nextDate, bill.cadence)
    await db
      .update(recurringExpenses)
      .set({ nextDate })
      .where(eq(recurringExpenses.id, id))
    return { nextDate }
  })
}

function monthSummarySelect(db: Db, monthPrefix: string) {
  return db
    .select({
      income:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`.mapWith(
          Number,
        ),
      expenses:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .where(like(transactions.transactionDate, monthPrefix))
}

export async function getOverview(yearMonth = currentYearMonth()) {
  return withDb(async (db) => {
    const month = isYearMonth(yearMonth) ? yearMonth : currentYearMonth()
    const monthPrefix = `${month}%`
    const priorMonth = shiftYearMonth(month, -1)
    const priorPrefix = `${priorMonth}%`
    const [
      settingsRows,
      monthBudgetRows,
      summaryRows,
      priorSummaryRows,
      categorySpend,
      recentRows,
      activeRecurring,
    ] = await Promise.all([
      db
        .select({
          budget: settings.budget,
          currency: settings.currency,
          seededAt: settings.seededAt,
        })
        .from(settings)
        .where(eq(settings.id, 'default'))
        .limit(1),
      db
        .select({ budget: monthlyBudgets.budget })
        .from(monthlyBudgets)
        .where(eq(monthlyBudgets.yearMonth, month))
        .limit(1),
      monthSummarySelect(db, monthPrefix),
      monthSummarySelect(db, priorPrefix),
      db
        .select({
          categoryId: categories.id,
          name: categories.name,
          amount: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(
            Number,
          ),
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.type, 'expense'),
            like(transactions.transactionDate, monthPrefix),
          ),
        )
        .groupBy(categories.id, categories.name)
        .orderBy(sql`sum(${transactions.amount}) desc`),
      transactionsQuery(db)
        .where(like(transactions.transactionDate, monthPrefix))
        .limit(RECENT_TRANSACTION_LIMIT),
      recurringQuery(db)
        .where(eq(recurringExpenses.active, true))
        .orderBy(recurringExpenses.nextDate),
    ])

    const settingsRow = settingsRows[0]
    const defaultBudget = settingsRow?.budget ?? 2500
    const settingsData: AppSettings = {
      budget: defaultBudget,
      currency: settingsRow?.currency ?? 'USD',
      seeded: Boolean(settingsRow?.seededAt),
    }
    const monthBudget: MonthBudget = resolveMonthBudget(
      month,
      defaultBudget,
      monthBudgetRows[0]?.budget,
    )
    const summary = {
      income: summaryRows[0]?.income ?? 0,
      expenses: summaryRows[0]?.expenses ?? 0,
    }
    const priorSummary = {
      income: priorSummaryRows[0]?.income ?? 0,
      expenses: priorSummaryRows[0]?.expenses ?? 0,
    }
    const budget = monthBudget.budget
    const breakdown = categoryBudgetBreakdown(
      categorySpend.map((row) => ({
        category: row.name,
        amount: row.amount,
      })),
      budget,
    )
    const categoryRows = breakdown.map((row) => {
      const match = categorySpend.find((item) => item.name === row.name)
      return {
        ...row,
        categoryId: match?.categoryId ?? '',
      }
    })
    const recurringMonthly = activeRecurring.reduce(
      (sum, row) => sum + monthlyEquivalent(row.amount, row.cadence),
      0,
    )

    const today = todayIso()
    const recurringRows = activeRecurring as RecurringExpenseRow[]
    const dueRecurring = recurringRows.filter((row) => {
      const status = dueStatus(row.nextDate, today)
      return status === 'due' || status === 'overdue'
    })
    const upcomingRecurring =
      dueRecurring.length > 0
        ? dueRecurring.slice(0, DUE_RECURRING_LIMIT)
        : recurringRows.slice(0, UPCOMING_RECURRING_LIMIT)

    return {
      settings: settingsData,
      yearMonth: month,
      priorYearMonth: priorMonth,
      monthBudget,
      summary,
      priorSummary,
      remaining: budget - summary.expenses,
      budgetUsed: budget > 0 ? summary.expenses / budget : 0,
      categories: categoryRows,
      recentTransactions: recentRows,
      recurringMonthly,
      recurringOfBudget: budget > 0 ? recurringMonthly / budget : 0,
      upcomingRecurring,
      dueRecurringCount: dueRecurring.length,
    }
  })
}

