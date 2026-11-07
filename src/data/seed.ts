import { count, eq } from 'drizzle-orm'
import { getDb } from '#/db/index'
import { accounts, categories, settings } from '#/db/schema'
import { expenseCategories } from '#/data/sample-ledger'
import type { AccountType } from '#/lib/types'

const PRESET_EXPENSE = new Set<string>(expenseCategories)

/** One-tap preset for the Categories wizard step. */
export const COMMON_EXPENSE_CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Other',
] as const satisfies ReadonlyArray<(typeof expenseCategories)[number]>

export type OnboardingInput = {
  budget: number
  currency: string
  primaryAccount: {
    name: string
    type: AccountType
    startingBalance: number
  }
  /** Subset of expenseCategories; may be empty (Income still seeded). */
  expenseCategoryNames: string[]
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
  if (row.seededAt) return false

  const db = await getDb()
  const [{ value: categoryCount }] = await db
    .select({ value: count() })
    .from(categories)

  if (categoryCount > 0) {
    await db
      .update(settings)
      .set({ seededAt: new Date() })
      .where(eq(settings.id, 'default'))
    return false
  }

  return true
}

function normalizeExpenseNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name || !PRESET_EXPENSE.has(name) || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

async function insertSelectedCategories(expenseNames: string[]) {
  const db = await getDb()
  const categoryRows = [
    ...normalizeExpenseNames(expenseNames).map((name) => ({
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
  return categoryRows
}

export async function completeOnboarding(input: OnboardingInput) {
  const db = await getDb()
  const row = await ensureSettingsRow()
  if (row.seededAt) return { alreadyDone: true as const }

  const name = input.primaryAccount.name.trim()
  if (!name) throw new Error('Enter an account name')
  if (
    input.primaryAccount.type !== 'asset' &&
    input.primaryAccount.type !== 'liability'
  ) {
    throw new Error('Choose a valid account type')
  }
  if (
    !Number.isFinite(input.primaryAccount.startingBalance) ||
    input.primaryAccount.startingBalance < 0
  ) {
    throw new Error('Enter a valid starting balance (0 or more)')
  }

  await insertSelectedCategories(input.expenseCategoryNames ?? [])
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    name,
    type: input.primaryAccount.type,
    startingBalance: input.primaryAccount.startingBalance,
    closed: false,
  })

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
