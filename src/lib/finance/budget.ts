import type { TransactionType } from '#/lib/types'

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export function priorDeltaRatio(current: number, prior: number) {
  if (prior === 0) return current === 0 ? 0 : null
  return (current - prior) / prior
}

export function resolveMonthBudget(
  yearMonth: string,
  defaultBudget: number,
  override: number | undefined,
): {
  yearMonth: string
  budget: number
  defaultBudget: number
  isCustom: boolean
} {
  if (override !== undefined) {
    return { yearMonth, budget: override, defaultBudget, isCustom: true }
  }
  return { yearMonth, budget: defaultBudget, defaultBudget, isCustom: false }
}

export function monthBudgetMatchesDefault(
  monthBudget: number,
  defaultBudget: number,
) {
  return monthBudget === defaultBudget
}

export function amountToneClass(
  type: TransactionType,
  transferDirection?: 'in' | 'out' | null,
) {
  if (type === 'income') return 'text-income'
  if (type === 'transfer') {
    if (transferDirection === 'in') return 'text-income'
    if (transferDirection === 'out') return 'text-expense'
    return 'text-muted-foreground'
  }
  return 'text-expense'
}

export function signedAmountPrefix(
  type: TransactionType,
  transferDirection?: 'in' | 'out' | null,
) {
  if (type === 'income') return '+'
  if (type === 'transfer') {
    if (transferDirection === 'in') return '+'
    if (transferDirection === 'out') return '−'
    return ''
  }
  return '−'
}

export function categoryBudgetBreakdown(
  expenses: Array<{ category: string; amount: number }>,
  budget: number,
) {
  const totals = new Map<string, number>()
  for (const row of expenses) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount)
  }

  const entries = [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const spendTotal = entries.reduce((sum, item) => sum + item.amount, 0)

  return entries.map((row) => ({
    name: row.name,
    amount: row.amount,
    ofSpend: spendTotal > 0 ? row.amount / spendTotal : 0,
    ofBudget: budget > 0 ? row.amount / budget : 0,
  }))
}
