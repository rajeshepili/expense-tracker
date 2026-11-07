import { MONEY_EPSILON, todayIso } from './finance'
import type {
  SavingsGoalInput,
  SavingsGoalRow,
  SavingsGoalUpdate,
} from './types'

export type SavingsGoalAmounts = Pick<
  SavingsGoalRow,
  'targetAmount' | 'currentAmount'
>

export type RankedSavingsGoal = {
  goal: SavingsGoalRow
  remaining: number
  categoryMatch: boolean
}

export { MONEY_EPSILON }

export function savingsRemaining(goal: SavingsGoalAmounts): number {
  const left = goal.targetAmount - goal.currentAmount
  return left > MONEY_EPSILON ? left : 0
}

export function isSavingsGoalOpen(goal: SavingsGoalAmounts): boolean {
  return goal.currentAmount < goal.targetAmount - MONEY_EPSILON
}

export function hasOpenSavingsGoal(
  goals: readonly SavingsGoalAmounts[],
): boolean {
  for (const goal of goals) {
    if (isSavingsGoalOpen(goal)) return true
  }
  return false
}

export function shouldPromptFundGoal(
  goals: readonly SavingsGoalAmounts[] | undefined,
): boolean {
  return goals === undefined || hasOpenSavingsGoal(goals)
}

export function savingsProgressPercent(goal: SavingsGoalAmounts): number {
  if (goal.targetAmount <= 0) return 100
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
}

export function partitionSavingsGoals(goals: readonly SavingsGoalRow[]): {
  open: SavingsGoalRow[]
  complete: SavingsGoalRow[]
} {
  const open: SavingsGoalRow[] = []
  const complete: SavingsGoalRow[] = []
  for (const goal of goals) {
    if (isSavingsGoalOpen(goal)) open.push(goal)
    else complete.push(goal)
  }
  return { open, complete }
}

export function rankOpenSavingsGoals(
  goals: readonly SavingsGoalRow[],
  categoryId: string,
): RankedSavingsGoal[] {
  const ranked: RankedSavingsGoal[] = []
  for (const goal of goals) {
    const remaining = savingsRemaining(goal)
    if (remaining <= 0) continue
    ranked.push({
      goal,
      remaining,
      categoryMatch: goal.categoryId !== null && goal.categoryId === categoryId,
    })
  }
  ranked.sort((a, b) => {
    if (a.categoryMatch !== b.categoryMatch) {
      return a.categoryMatch ? -1 : 1
    }
    if (a.remaining !== b.remaining) return a.remaining - b.remaining
    const byName = a.goal.name.localeCompare(b.goal.name)
    if (byName !== 0) return byName
    return a.goal.id.localeCompare(b.goal.id)
  })
  return ranked
}

export function findRankedGoal(
  ranked: readonly RankedSavingsGoal[],
  goalId: string,
): RankedSavingsGoal | undefined {
  for (const item of ranked) {
    if (item.goal.id === goalId) return item
  }
  return undefined
}

export function defaultContributionAmount(
  incomeAmount: number,
  remaining: number,
): number {
  if (!Number.isFinite(incomeAmount) || incomeAmount <= 0) return 0
  if (!Number.isFinite(remaining) || remaining <= 0) return 0
  return Math.min(incomeAmount, remaining)
}

export function parsePositiveAmount(raw: string): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function exceedsRemaining(amount: number, remaining: number): boolean {
  return amount > remaining + MONEY_EPSILON
}

export function daysUntilTargetDate(
  targetDate: string | null,
  today: string = todayIso(),
): number | null {
  if (!targetDate) return null
  const target = new Date(`${targetDate}T12:00:00`)
  const now = new Date(`${today}T12:00:00`)
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return null
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysUntilLabel(days: number): string {
  if (days > 0) return `${days} days left`
  if (days === 0) return 'Due today'
  return `${Math.abs(days)} days overdue`
}

export function normalizeSavingsGoalCreate(input: SavingsGoalInput): {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  categoryId: string | null
} {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error('Target amount must be greater than 0')
  }
  const current = input.currentAmount ?? 0
  if (!Number.isFinite(current) || current < 0) {
    throw new Error('Current amount must be 0 or more')
  }
  return {
    name,
    targetAmount: input.targetAmount,
    currentAmount: Math.min(current, input.targetAmount),
    targetDate: input.targetDate ?? null,
    categoryId: input.categoryId ?? null,
  }
}

export function normalizeSavingsGoalUpdate(
  input: SavingsGoalUpdate,
  existing: SavingsGoalAmounts,
): SavingsGoalUpdate | null {
  const updates: SavingsGoalUpdate = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error('Name is required')
    updates.name = name
  }

  if (input.targetAmount !== undefined) {
    if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
      throw new Error('Target amount must be greater than 0')
    }
    updates.targetAmount = input.targetAmount
  }

  if (input.currentAmount !== undefined) {
    if (!Number.isFinite(input.currentAmount) || input.currentAmount < 0) {
      throw new Error('Current amount must be 0 or more')
    }
    updates.currentAmount = input.currentAmount
  }

  if (input.targetDate !== undefined) updates.targetDate = input.targetDate
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId

  if (Object.keys(updates).length === 0) return null

  const nextTarget = updates.targetAmount ?? existing.targetAmount
  const nextCurrent = updates.currentAmount ?? existing.currentAmount
  if (nextCurrent > nextTarget) {
    updates.currentAmount = nextTarget
  }

  return updates
}

export function applyContribution(
  goal: SavingsGoalAmounts,
  amount: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution must be greater than 0')
  }
  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0) {
    throw new Error('Invalid savings goal target')
  }
  if (!Number.isFinite(goal.currentAmount) || goal.currentAmount < 0) {
    throw new Error('Invalid savings goal balance')
  }
  const next = goal.currentAmount + amount
  return Math.min(goal.targetAmount, Math.max(0, next))
}
