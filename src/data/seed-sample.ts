/**
 * Load a rich local demo dataset after (or instead of) empty onboarding.
 */
import { eq } from 'drizzle-orm'
import { getDb } from '#/db/index'
import { accounts, categories, settings } from '#/db/schema'
import {
  createAccount,
  createRecurring,
  createSavingsGoal,
  createTransaction,
  createTransfer,
  setMonthBudget,
  updateAccount,
} from '#/data/repository'
import {
  expenseCategories,
  ledgerTransactions,
  recurringExpenses,
  sampleSavingsGoals,
  sampleTransfers,
} from '#/data/sample-ledger'
import { completeOnboarding } from '#/data/seed'
import { shiftYearMonth, currentYearMonth } from '#/lib/finance'

/** Map legacy sample "payment method" labels → account names. */
const METHOD_TO_ACCOUNT: Record<string, string> = {
  'Debit card': 'Debit card',
  'Credit card': 'Credit card',
  Cash: 'Cash',
  'Bank transfer': 'Checking',
  'Direct deposit': 'Checking',
}

const SAMPLE_ACCOUNTS = [
  { name: 'Checking', type: 'asset' as const, startingBalance: 2400 },
  { name: 'Debit card', type: 'asset' as const, startingBalance: 180 },
  { name: 'Cash', type: 'asset' as const, startingBalance: 60 },
  { name: 'Credit card', type: 'liability' as const, startingBalance: 220 },
  {
    name: 'Old savings (closed)',
    type: 'asset' as const,
    startingBalance: 0,
    closed: true,
  },
]

export async function loadSampleData(opts?: {
  budget?: number
  currency?: string
}) {
  const budget = opts?.budget ?? 2500
  const currency = opts?.currency ?? 'USD'

  await completeOnboarding({
    budget,
    currency,
    primaryAccount: {
      name: 'Checking',
      type: 'asset',
      startingBalance: 2400,
    },
    expenseCategoryNames: [...expenseCategories],
  })

  const db = await getDb()

  // completeOnboarding created Checking — create the rest.
  for (const account of SAMPLE_ACCOUNTS) {
    if (account.name === 'Checking') continue
    const row = await createAccount({
      name: account.name,
      type: account.type,
      startingBalance: account.startingBalance,
    })
    if (account.closed) {
      await updateAccount(row.id, { closed: true })
    }
  }

  const categoryRows = await db.select().from(categories)
  const accountRows = await db.select().from(accounts)
  const categoryByName = new Map(categoryRows.map((c) => [c.name, c.id]))
  const accountByName = new Map(accountRows.map((a) => [a.name, a.id]))

  function accountIdForMethod(method: string) {
    const name = METHOD_TO_ACCOUNT[method] ?? 'Checking'
    const id = accountByName.get(name)
    if (!id) throw new Error(`Sample account missing: ${name}`)
    return id
  }

  for (const tx of ledgerTransactions) {
    const categoryId = categoryByName.get(tx.category)
    if (!categoryId) continue
    await createTransaction({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      categoryId,
      accountId: accountIdForMethod(tx.paymentMethod),
    })
  }

  for (const transfer of sampleTransfers) {
    await createTransfer({
      fromAccountId: accountIdForMethod(transfer.fromAccount),
      toAccountId: accountIdForMethod(transfer.toAccount),
      amount: transfer.amount,
      date: transfer.date,
      description: transfer.description,
    })
  }

  for (const row of recurringExpenses) {
    const categoryId = categoryByName.get(row.category)
    if (!categoryId) continue
    await createRecurring({
      name: row.name,
      kind: row.kind ?? 'expense',
      amount: row.amount,
      cadence: row.cadence,
      nextDate: row.nextDate,
      categoryId,
      paymentMethodId: accountIdForMethod(row.paymentMethod),
      active: row.active,
    })
  }

  for (const goal of sampleSavingsGoals) {
    const categoryId = categoryByName.get(goal.category) ?? null
    await createSavingsGoal({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      categoryId,
    })
  }

  // Custom budget on a prior month so Overview month badge can show override.
  await setMonthBudget(shiftYearMonth(currentYearMonth(), -1), 2300)

  // Ensure seededAt is set (completeOnboarding already did).
  await db
    .update(settings)
    .set({ seededAt: new Date() })
    .where(eq(settings.id, 'default'))

  return { ok: true as const }
}
