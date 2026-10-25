import { count, eq } from 'drizzle-orm'
import { getDb } from '#/db/index'
import {
  categories,
  paymentMethods,
  recurringExpenses,
  settings,
  transactions,
} from '#/db/schema'
import {
  expenseCategories,
  ledgerTransactions,
  paymentMethods as samplePaymentMethods,
  recurringExpenses as sampleRecurring,
} from '#/data/sample-ledger'

export type OnboardingInput = {
  budget: number
  currency: string
  loadSample: boolean
}

export async function ensureSettingsRow() {
  const db = await getDb()
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 'default'))
    .limit(1)
  if (row) return row
  await db.insert(settings).values({
    id: 'default',
    budget: 2500,
    currency: 'USD',
  })
  const [created] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 'default'))
    .limit(1)
  return created
}

export async function needsOnboarding() {
  const row = await ensureSettingsRow()
  if (row?.seededAt) return false

  const db = await getDb()
  const [{ value: categoryCount }] = await db
    .select({ value: count() })
    .from(categories)

  if ((categoryCount ?? 0) > 0) {
    await db
      .update(settings)
      .set({ seededAt: new Date() })
      .where(eq(settings.id, 'default'))
    return false
  }

  return true
}

async function insertDefaultCatalog() {
  const db = await getDb()
  const categoryRows = [
    ...expenseCategories.map((name) => ({
      id: crypto.randomUUID(),
      name,
      type: 'expense' as const,
    })),
    {
      id: crypto.randomUUID(),
      name: 'Income',
      type: 'income' as const,
    },
  ]
  await db.insert(categories).values(categoryRows)

  const methodRows = samplePaymentMethods.map((name) => ({
    id: crypto.randomUUID(),
    name,
  }))
  await db.insert(paymentMethods).values(methodRows)

  return {
    categoryByName: Object.fromEntries(
      categoryRows.map((row) => [row.name, row.id]),
    ),
    methodByName: Object.fromEntries(
      methodRows.map((row) => [row.name, row.id]),
    ),
  }
}

async function insertSampleActivity(
  categoryByName: Record<string, string>,
  methodByName: Record<string, string>,
) {
  const db = await getDb()
  await db.insert(transactions).values(
    ledgerTransactions.map((row) => ({
      id: crypto.randomUUID(),
      description: row.description,
      amount: row.amount,
      type: row.type,
      transactionDate: row.date,
      categoryId: categoryByName[row.category]!,
      paymentMethodId: methodByName[row.paymentMethod] ?? null,
    })),
  )

  await db.insert(recurringExpenses).values(
    sampleRecurring.map((row) => ({
      id: crypto.randomUUID(),
      name: row.name,
      amount: row.amount,
      cadence: row.cadence,
      nextDate: row.nextDate,
      active: row.active,
      categoryId: categoryByName[row.category]!,
    })),
  )
}

export async function completeOnboarding(input: OnboardingInput) {
  const db = await getDb()
  const row = await ensureSettingsRow()
  if (row?.seededAt) return { alreadyDone: true as const }

  const catalog = await insertDefaultCatalog()
  if (input.loadSample) {
    await insertSampleActivity(catalog.categoryByName, catalog.methodByName)
  }

  await db
    .update(settings)
    .set({
      budget: input.budget,
      currency: input.currency,
      seededAt: new Date(),
    })
    .where(eq(settings.id, 'default'))

  return { alreadyDone: false as const }
}
