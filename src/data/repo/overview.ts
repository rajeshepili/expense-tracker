import { and, eq, sql, gte, lt } from 'drizzle-orm'
import {
  accounts,
  categories,
  monthlyBudgets,
  recurringExpenses,
  settings,
  transactions,
  savingsGoals,
} from '#/db/schema'
import { accountDeltasQuery, baseTransactionQuery } from '#/data/query-builders'
import {
  DUE_RECURRING_LIMIT,
  RECENT_TRANSACTION_LIMIT,
  UPCOMING_RECURRING_LIMIT,
} from '#/lib/app-config'
import {
  categoryBudgetBreakdown,
  currentYearMonth,
  dueStatus,
  isYearMonth,
  monthlyEquivalent,
  netWorth,
  projectRestOfMonth,
  resolveMonthBudget,
  shiftYearMonth,
  todayIso,
  yearMonthRange,
  yearRange,
} from '#/lib/finance'
import type { AppSettings, MonthBudget, RecurringExpenseRow } from '#/lib/types'
import { withDb } from '#/data/repo/db'
import type { Db } from '#/data/repo/db'
import { recurringQuery } from '#/data/repo/recurring'

export type YearOverview = {
  year: string
  months: Array<{ yearMonth: string; income: number; expenses: number }>
  totalIncome: number
  totalExpenses: number
  topCategories: Array<{ categoryId: string; name: string; amount: number }>
  savingsSaved: number
}

export async function getYearOverview(year: string): Promise<YearOverview> {
  const { from, to } = yearRange(year)
  const dateInYear = and(
    gte(transactions.transactionDate, from),
    lt(transactions.transactionDate, to),
  )
  return withDb(async (db) => {
    const [monthlyRows, categoryRows, goalRows] = await Promise.all([
      db
        .select({
          yearMonth: sql<string>`substr(${transactions.transactionDate}, 1, 7)`,
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
        .where(dateInYear)
        .groupBy(sql`substr(${transactions.transactionDate}, 1, 7)`)
        .orderBy(sql`substr(${transactions.transactionDate}, 1, 7)`),
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
        .where(and(eq(transactions.type, 'expense'), dateInYear))
        .groupBy(categories.id, categories.name)
        .orderBy(sql`sum(${transactions.amount}) desc`)
        .limit(5),
      db.select({ current: savingsGoals.currentAmount }).from(savingsGoals),
    ])

    const monthsByKey = new Map(monthlyRows.map((row) => [row.yearMonth, row]))
    const months = Array.from({ length: 12 }, (_, i) => {
      const ym = `${year}-${String(i + 1).padStart(2, '0')}`
      const found = monthsByKey.get(ym)
      return {
        yearMonth: ym,
        income: found?.income ?? 0,
        expenses: found?.expenses ?? 0,
      }
    })

    return {
      year,
      months,
      totalIncome: monthlyRows.reduce((sum, row) => sum + row.income, 0),
      totalExpenses: monthlyRows.reduce((sum, row) => sum + row.expenses, 0),
      topCategories: categoryRows,
      savingsSaved: goalRows.reduce((sum, row) => sum + (row.current ?? 0), 0),
    }
  })
}

function monthSummarySelect(db: Db, yearMonth: string) {
  const { from, to } = yearMonthRange(yearMonth)
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
    .where(
      and(
        gte(transactions.transactionDate, from),
        lt(transactions.transactionDate, to),
      ),
    )
}

async function openAccountsWithBalances(db: Db) {
  const [rows, deltas] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(eq(accounts.closed, false))
      .orderBy(accounts.name),
    accountDeltasQuery(db),
  ])

  const deltaByAccount = new Map(
    deltas
      .filter((row) => row.accountId)
      .map((row) => [row.accountId!, row.delta ?? 0]),
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.startingBalance + (deltaByAccount.get(row.id) ?? 0),
  }))
}

export async function getOverview(yearMonth = currentYearMonth()) {
  return withDb(async (db) => {
    const month = isYearMonth(yearMonth) ? yearMonth : currentYearMonth()
    const priorMonth = shiftYearMonth(month, -1)
    const monthDates = yearMonthRange(month)
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
      monthSummarySelect(db, month),
      monthSummarySelect(db, priorMonth),
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
            gte(transactions.transactionDate, monthDates.from),
            lt(transactions.transactionDate, monthDates.to),
          ),
        )
        .groupBy(categories.id, categories.name)
        .orderBy(sql`sum(${transactions.amount}) desc`),
      baseTransactionQuery(db)
        .where(
          and(
            gte(transactions.transactionDate, monthDates.from),
            lt(transactions.transactionDate, monthDates.to),
          ),
        )
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
    const spendByName = new Map(
      categorySpend.map((row) => [row.name, row.categoryId]),
    )
    const categoryRows = breakdown.map((row) => ({
      ...row,
      categoryId: spendByName.get(row.name) ?? '',
    }))
    const remaining = budget - summary.expenses
    const recurringMonthly = activeRecurring.reduce(
      (sum, row) =>
        row.kind === 'income'
          ? sum
          : sum + monthlyEquivalent(row.amount, row.cadence),
      0,
    )
    const recurringMonthlyIncome = activeRecurring.reduce(
      (sum, row) =>
        row.kind === 'income'
          ? sum + monthlyEquivalent(row.amount, row.cadence)
          : sum,
      0,
    )
    const projection = projectRestOfMonth(activeRecurring)

    const today = todayIso()
    const recurringRows = activeRecurring as RecurringExpenseRow[]
    const dueRecurring = recurringRows.filter((row) => {
      if (row.kind !== 'expense') return false
      if (row.nextDate < monthDates.from || row.nextDate >= monthDates.to) return false
      const status = dueStatus(row.nextDate, today)
      return status === 'due' || status === 'overdue'
    })
    const upcomingInMonth = recurringRows.filter(
      (row) =>
        row.nextDate >= monthDates.from && row.nextDate < monthDates.to,
    )
    const upcomingRecurring =
      dueRecurring.length > 0
        ? dueRecurring.slice(0, DUE_RECURRING_LIMIT)
        : upcomingInMonth.slice(0, UPCOMING_RECURRING_LIMIT)

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
      recurringMonthlyIncome,
      recurringOfBudget: budget > 0 ? recurringMonthly / budget : 0,
      upcomingRecurring,
      dueRecurringCount: dueRecurring.length,
      projection,
      projectedRemaining: remaining + projection.net,
      accounts: overviewAccounts,
      netWorth: netWorth(overviewAccounts),
    }
  })
}
