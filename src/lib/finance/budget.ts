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

export function amountToneClass(type: TransactionType) {
  return type === 'income' ? 'text-income' : 'text-expense'
}

export function signedAmountPrefix(type: TransactionType) {
  return type === 'income' ? '+' : '−'
}

export function summarizeTransactions(
  rows: Array<{ type: TransactionType; amount: number }>,
) {
  return rows.reduce(
    (acc, row) => {
      if (row.type === 'income') acc.income += row.amount
      else acc.expenses += row.amount
      return acc
    },
    { income: 0, expenses: 0 },
  )
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
