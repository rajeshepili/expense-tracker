import { and, eq, like, sql } from 'drizzle-orm'
import {
  accounts,
  categories,
  monthlyBudgets,
  recurringExpenses,
  settings,
  transactions,
} from '#/db/schema'
import { baseTransactionQuery } from '#/data/query-builders'
import {
  DUE_RECURRING_LIMIT,
  RECENT_TRANSACTION_LIMIT,
  UPCOMING_RECURRING_LIMIT,
} from '#/lib/app-config'
import {
  accountBalance,
  categoryBudgetBreakdown,
  currentYearMonth,
  dueStatus,
  isYearMonth,
  monthlyEquivalent,
  netWorth,
  resolveMonthBudget,
  shiftYearMonth,
  todayIso,
} from '#/lib/finance'
import type {
  AppSettings,
  MonthBudget,
  RecurringExpenseRow,
  TransactionType,
  TransferDirection,
} from '#/lib/types'
import { withDb } from '#/data/repo/db'
import type { Db } from '#/data/repo/db'
import { recurringQuery } from '#/data/repo/recurring'

function monthSummarySelect(db: Db, monthPrefix: string) {
  return db
    .select({
      income:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`.mapWith(
          Number,
        ),
      expenses:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .where(like(transactions.transactionDate, monthPrefix))
}

async function openAccountsWithBalances(db: Db) {
  const [rows, deltas] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(eq(accounts.closed, false))
      .orderBy(accounts.name),
    db
      .select({
        accountId: transactions.accountId,
        type: transactions.type,
        amount: transactions.amount,
        transferDirection: transactions.transferDirection,
      })
      .from(transactions)
      .where(sql`${transactions.accountId} is not null`),
  ])

  const rowsByAccount = new Map<
    string,
    Array<{
      type: TransactionType
      amount: number
      transferDirection: TransferDirection | null
    }>
  >()
  for (const delta of deltas) {
    if (!delta.accountId) continue
    const list = rowsByAccount.get(delta.accountId) ?? []
    list.push({
      type: delta.type,
      amount: delta.amount,
      transferDirection: delta.transferDirection,
    })
    rowsByAccount.set(delta.accountId, list)
  }

  return rows.map((row) => {
    const balance = accountBalance(
      row.startingBalance,
      rowsByAccount.get(row.id) ?? [],
      row.type,
    )
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      balance,
    }
  })
}

export async function getOverview(yearMonth = currentYearMonth()) {
  return withDb(async (db) => {
    const month = isYearMonth(yearMonth) ? yearMonth : currentYearMonth()
    const monthPrefix = `${month}%`
    const priorMonth = shiftYearMonth(month, -1)
    const priorPrefix = `${priorMonth}%`
    const [
      settingsRows,
      monthBudgetRows,
      summaryRows,
      priorSummaryRows,
      categorySpend,
      recentRows,
      activeRecurring,
      overviewAccounts,
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
        .where(eq(monthlyBudgets.yearMonth, month))
        .limit(1),
      monthSummarySelect(db, monthPrefix),
      monthSummarySelect(db, priorPrefix),
      db
        .select({
          categoryId: categories.id,
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
      baseTransactionQuery(db)
        .where(like(transactions.transactionDate, monthPrefix))
        .limit(RECENT_TRANSACTION_LIMIT),
      recurringQuery(db)
        .where(eq(recurringExpenses.active, true))
        .orderBy(recurringExpenses.nextDate),
      openAccountsWithBalances(db),
    ])

    const settingsRow = settingsRows[0]
    const defaultBudget = settingsRow?.budget ?? 2500
    const settingsData: AppSettings = {
      budget: defaultBudget,
      currency: settingsRow?.currency ?? 'USD',
      seeded: Boolean(settingsRow?.seededAt),
    }
    const monthBudget: MonthBudget = resolveMonthBudget(
      month,
      defaultBudget,
      monthBudgetRows[0]?.budget,
    )
    const summary = {
      income: summaryRows[0]?.income ?? 0,
      expenses: summaryRows[0]?.expenses ?? 0,
    }
    const priorSummary = {
      income: priorSummaryRows[0]?.income ?? 0,
      expenses: priorSummaryRows[0]?.expenses ?? 0,
    }
    const budget = monthBudget.budget
    const breakdown = categoryBudgetBreakdown(
      categorySpend.map((row) => ({
        category: row.name,
        amount: row.amount,
      })),
      budget,
    )
    const categoryRows = breakdown.map((row) => {
      const match = categorySpend.find((item) => item.name === row.name)
      return {
        ...row,
        categoryId: match?.categoryId ?? '',
      }
    })
    const recurringMonthly = activeRecurring.reduce(
      (sum, row) => sum + monthlyEquivalent(row.amount, row.cadence),
      0,
    )

    const today = todayIso()
    const recurringRows = activeRecurring as RecurringExpenseRow[]
    const dueRecurring = recurringRows.filter((row) => {
      const status = dueStatus(row.nextDate, today)
      return status === 'due' || status === 'overdue'
    })
    const upcomingRecurring =
      dueRecurring.length > 0
        ? dueRecurring.slice(0, DUE_RECURRING_LIMIT)
        : recurringRows.slice(0, UPCOMING_RECURRING_LIMIT)

    return {
      settings: settingsData,
      yearMonth: month,
      priorYearMonth: priorMonth,
      monthBudget,
      summary,
      priorSummary,
      remaining: budget - summary.expenses,
      budgetUsed: budget > 0 ? summary.expenses / budget : 0,
      categories: categoryRows,
      recentTransactions: recentRows,
      recurringMonthly,
      recurringOfBudget: budget > 0 ? recurringMonthly / budget : 0,
      upcomingRecurring,
      dueRecurringCount: dueRecurring.length,
      accounts: overviewAccounts,
      netWorth: netWorth(overviewAccounts),
    }
  })
}
