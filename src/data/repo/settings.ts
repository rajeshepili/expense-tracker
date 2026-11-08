import { eq } from 'drizzle-orm'
import { monthlyBudgets, settings } from '#/db/schema'
import {
  completeOnboarding as completeOnboardingSeed,
  ensureSettingsRow,
} from '#/data/seed'
import type { OnboardingInput } from '#/data/seed'
import { currentYearMonth, resolveMonthBudget } from '#/lib/finance'
import type { AppSettings, MonthBudget } from '#/lib/types'
import {
  bootstrapDatabase,
  markOnboardingComplete,
  withDb,
} from '#/data/repo/db'

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
  markOnboardingComplete()
  return result
}

export async function loadSampleData(opts?: {
  budget?: number
  currency?: string
}) {
  await bootstrapDatabase()
  const { loadSampleData: seedSample } = await import('#/data/seed-sample')
  const result = await seedSample(opts)
  markOnboardingComplete()
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
