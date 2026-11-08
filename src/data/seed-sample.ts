/** Load demo data after onboarding. Bulk inserts run in one transaction. */
import { eq } from 'drizzle-orm'
import { getDb } from '#/db/index'
import {
  accounts,
  categories,
  monthlyBudgets,
  recurringExpenses as recurringTable,
  savingsGoals,
  settings,
  transactions,
} from '#/db/schema'
import {
  expenseCategories,
  ledgerTransactions,
  recurringExpenses,
  sampleSavingsGoals,
  sampleTransfers,
} from '#/data/sample-ledger'
import { completeOnboarding } from '#/data/seed'
import { resolveSampleAccountName } from '#/data/sample-account-map'
import { shiftYearMonth, currentYearMonth } from '#/lib/finance'

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

  await db.transaction(async (tx) => {
    // Checking already exists from onboarding.
    const extraAccounts = SAMPLE_ACCOUNTS.filter(
      (a) => a.name !== 'Checking',
    ).map((account) => ({
      id: crypto.randomUUID(),
      name: account.name,
      type: account.type,
      startingBalance: account.startingBalance,
      closed: Boolean(account.closed),
    }))
    if (extraAccounts.length > 0) {
      await tx.insert(accounts).values(extraAccounts)
    }

    const categoryRows = await tx.select().from(categories)
    const accountRows = await tx.select().from(accounts)
    const categoryByName = new Map(categoryRows.map((c) => [c.name, c.id]))
    const accountByName = new Map(accountRows.map((a) => [a.name, a.id]))

    function accountIdForMethod(method: string) {
      const name = resolveSampleAccountName(method)
      const id = accountByName.get(name)
      if (!id) throw new Error(`Sample account missing: ${name}`)
      return id
    }

    const txRows = ledgerTransactions.flatMap((row) => {
      const categoryId = categoryByName.get(row.category)
      if (!categoryId) return []
      return [
        {
          id: crypto.randomUUID(),
          description: row.description,
          amount: row.amount,
          type: row.type,
          transactionDate: row.date,
          categoryId,
          accountId: accountIdForMethod(row.paymentMethod),
          sourceRecurringId: null,
          transferId: null,
          transferDirection: null,
        },
      ]
    })
    if (txRows.length > 0) {
      await tx.insert(transactions).values(txRows)
    }

    const transferRows = sampleTransfers.flatMap((transfer) => {
      const outId = crypto.randomUUID()
      const inId = crypto.randomUUID()
      const fromId = accountIdForMethod(transfer.fromAccount)
      const toId = accountIdForMethod(transfer.toAccount)
      return [
        {
          id: outId,
          description: transfer.description,
          amount: transfer.amount,
          type: 'transfer' as const,
          transactionDate: transfer.date,
          categoryId: null,
          accountId: fromId,
          sourceRecurringId: null,
          transferId: inId,
          transferDirection: 'out' as const,
        },
        {
          id: inId,
          description: transfer.description,
          amount: transfer.amount,
          type: 'transfer' as const,
          transactionDate: transfer.date,
          categoryId: null,
          accountId: toId,
          sourceRecurringId: null,
          transferId: outId,
          transferDirection: 'in' as const,
        },
      ]
    })
    if (transferRows.length > 0) {
      await tx.insert(transactions).values(transferRows)
    }

    const recurringRows = recurringExpenses.flatMap((row) => {
      const categoryId = categoryByName.get(row.category)
      if (!categoryId) return []
      return [
        {
          id: crypto.randomUUID(),
          name: row.name,
          kind: row.kind ?? ('expense' as const),
          amount: row.amount,
          cadence: row.cadence,
          nextDate: row.nextDate,
          categoryId,
          accountId: accountIdForMethod(row.paymentMethod),
          active: row.active,
        },
      ]
    })
    if (recurringRows.length > 0) {
      await tx.insert(recurringTable).values(recurringRows)
    }

    const goalRows = sampleSavingsGoals.map((goal) => ({
      id: crypto.randomUUID(),
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      categoryId: categoryByName.get(goal.category) ?? null,
    }))
    if (goalRows.length > 0) {
      await tx.insert(savingsGoals).values(goalRows)
    }

    await tx.insert(monthlyBudgets).values({
      yearMonth: shiftYearMonth(currentYearMonth(), -1),
      budget: 2300,
    })

    await tx
      .update(settings)
      .set({ seededAt: new Date() })
      .where(eq(settings.id, 'default'))
  })

  return { ok: true as const }
}
