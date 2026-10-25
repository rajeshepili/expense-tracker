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
  needsOnboarding,
  type OnboardingInput,
} from '#/data/seed'
import {
  RECENT_TRANSACTION_LIMIT,
  UPCOMING_RECURRING_LIMIT,
} from '#/lib/app-config'
import {
  categoryBudgetBreakdown,
  currentYearMonth,
  monthlyEquivalent,
  resolveMonthBudget,
} from '#/lib/finance'
import type {
  AppSettings,
  CategoryRow,
  LedgerTransaction,
  MonthBudget,
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
}

type RecurringInput = {
  name: string
  amount: number
  cadence: RecurrenceCadence
  nextDate: string
  categoryId: string
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
}

const recurringColumns = {
  id: recurringExpenses.id,
  name: recurringExpenses.name,
  amount: recurringExpenses.amount,
  cadence: recurringExpenses.cadence,
  nextDate: recurringExpenses.nextDate,
  active: recurringExpenses.active,
  category: categories.name,
  categoryId: categories.id,
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
  }
}

function recurringValues(input: RecurringInput) {
  return {
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    nextDate: input.nextDate,
    categoryId: input.categoryId,
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
    budget: row!.budget,
    currency: row!.currency,
    seeded: Boolean(row!.seededAt),
  }
}

export async function completeOnboarding(input: OnboardingInput) {
  await bootstrapDatabase()
  const result = await completeOnboardingSeed(input)
  bootstrapped = Promise.resolve({ needsOnboarding: false })
  return result
}

export async function updateBudget(budget: number) {
  return updateSettings({ budget })
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

export async function listTransactions(): Promise<LedgerTransaction[]> {
  return withDb(async (db) => transactionsQuery(db))
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

export async function getOverview() {
  return withDb(async (db) => {
    const yearMonth = currentYearMonth()
    const monthPrefix = `${yearMonth}%`
    const [
      settingsRows,
      monthBudgetRows,
      summaryRows,
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
        .where(eq(monthlyBudgets.yearMonth, yearMonth))
        .limit(1),
      db
        .select({
          income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`.mapWith(
            Number,
          ),
          expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`.mapWith(
            Number,
          ),
        })
        .from(transactions)
        .where(like(transactions.transactionDate, monthPrefix)),
      db
        .select({
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
      transactionsQuery(db).limit(RECENT_TRANSACTION_LIMIT),
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
      yearMonth,
      defaultBudget,
      monthBudgetRows[0]?.budget,
    )
    const summary = {
      income: summaryRows[0]?.income ?? 0,
      expenses: summaryRows[0]?.expenses ?? 0,
    }
    const budget = monthBudget.budget
    const categoryRows = categoryBudgetBreakdown(
      categorySpend.map((row) => ({
        category: row.name,
        amount: row.amount,
      })),
      budget,
    )
    const recurringMonthly = activeRecurring.reduce(
      (sum, row) => sum + monthlyEquivalent(row.amount, row.cadence),
      0,
    )

    return {
      settings: settingsData,
      monthBudget,
      summary,
      remaining: budget - summary.expenses,
      budgetUsed: budget > 0 ? summary.expenses / budget : 0,
      categories: categoryRows,
      recentTransactions: recentRows as LedgerTransaction[],
      recurringMonthly,
      recurringOfBudget: budget > 0 ? recurringMonthly / budget : 0,
      upcomingRecurring: activeRecurring.slice(
        0,
        UPCOMING_RECURRING_LIMIT,
      ) as RecurringExpenseRow[],
    }
  })
}

export async function findCategoryIdByName(
  name: string,
  type?: TransactionType,
) {
  return withDb(async (db) => {
    const rows = await db
      .select()
      .from(categories)
      .where(
        type
          ? and(eq(categories.name, name), eq(categories.type, type))
          : eq(categories.name, name),
      )
      .limit(1)
    return rows[0]?.id ?? null
  })
}
