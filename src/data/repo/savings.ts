import { desc, eq } from 'drizzle-orm'
import { savingsGoals } from '#/db/schema'
import { baseSavingsGoalQuery } from '#/data/query-builders'
import {
  applyContribution,
  normalizeSavingsGoalCreate,
  normalizeSavingsGoalUpdate,
} from '#/lib/savings'
import { NotFoundError } from '#/lib/errors'
import type {
  SavingsGoalInput,
  SavingsGoalRow,
  SavingsGoalUpdate,
} from '#/lib/types'
import { withDb } from '#/data/repo/db'

export async function listSavingsGoals(): Promise<SavingsGoalRow[]> {
  return withDb(async (db) =>
    baseSavingsGoalQuery(db).orderBy(desc(savingsGoals.createdAt)),
  )
}

export async function createSavingsGoal(input: SavingsGoalInput) {
  const values = normalizeSavingsGoalCreate(input)
  return withDb(async (db) => {
    const [row] = await db
      .insert(savingsGoals)
      .values(values)
      .returning({ id: savingsGoals.id })
    return row
  })
}

export async function updateSavingsGoal(id: string, input: SavingsGoalUpdate) {
  return withDb(async (db) => {
    const [existing] = await db
      .select({
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
      })
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .limit(1)
    if (!existing) throw new NotFoundError('Savings goal')

    const updates = normalizeSavingsGoalUpdate(input, existing)
    if (!updates) return { success: true as const }

    await db
      .update(savingsGoals)
      .set(updates)
      .where(eq(savingsGoals.id, id))
    return { success: true as const }
  })
}

export async function deleteSavingsGoal(id: string) {
  return withDb(async (db) => {
    const [goal] = await db
      .select({ id: savingsGoals.id })
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .limit(1)
    if (!goal) throw new NotFoundError('Savings goal')
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id))
    return { success: true as const }
  })
}

export async function recordSavingsContribution(id: string, amount: number) {
  return withDb(async (db) => {
    const [goal] = await db
      .select({
        targetAmount: savingsGoals.targetAmount,
        currentAmount: savingsGoals.currentAmount,
      })
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .limit(1)
    if (!goal) throw new NotFoundError('Savings goal')

    const currentAmount = applyContribution(goal, amount)
    if (currentAmount === goal.currentAmount) {
      return { currentAmount }
    }

    const [updated] = await db
      .update(savingsGoals)
      .set({ currentAmount })
      .where(eq(savingsGoals.id, id))
      .returning({ currentAmount: savingsGoals.currentAmount })
    return { currentAmount: updated?.currentAmount ?? currentAmount }
  })
}
