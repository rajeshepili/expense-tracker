import { eq } from 'drizzle-orm'
import { getDb, ensureDatabase, requireClientForMerge } from '#/db/index'
import {
  accounts,
  categories,
  monthlyBudgets,
  recurringExpenses,
  savingsGoals,
  settings,
  transactions,
} from '#/db/schema'
import { migrateSchema } from '#/db/migrate'
import { planMerge, summarizeMergePlan, countSkipped } from '#/lib/backup-merge'
import type {
  BackupSnapshot,
  MergePlan,
  MergeStats,
  SettingsSnapshot,
  CategorySnapshot,
  AccountSnapshot,
  TransactionSnapshot,
  RecurringSnapshot,
  SavingsSnapshot,
  MonthlyBudgetSnapshot,
} from '#/lib/backup-merge'

function toDate(unixSeconds: number | null | undefined): Date | null {
  if (unixSeconds == null || !Number.isFinite(unixSeconds)) return null
  const sec = unixSeconds > 1e12 ? unixSeconds / 1000 : unixSeconds
  return new Date(sec * 1000)
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function strOrNull(value: unknown): string | null {
  if (value == null || value === '') return null
  return String(value)
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1'
}

type SqlRow = Record<string, unknown>

async function readSnapshotFromClient(
  sql: <TRow extends SqlRow>(
    queryTemplate: TemplateStringsArray,
    ...params: unknown[]
  ) => Promise<TRow[]>,
): Promise<BackupSnapshot> {
  const [
    settingsRows,
    budgetRows,
    categoryRows,
    accountRows,
    txRows,
    recurringRows,
    savingsRows,
  ] = await Promise.all([
    sql<SqlRow>`SELECT * FROM settings WHERE id = 'default' LIMIT 1`,
    sql<SqlRow>`SELECT * FROM monthly_budgets`,
    sql<SqlRow>`SELECT * FROM categories`,
    sql<SqlRow>`SELECT * FROM payment_methods`,
    sql<SqlRow>`SELECT * FROM transactions`,
    sql<SqlRow>`SELECT * FROM recurring_expenses`,
    sql<SqlRow>`SELECT * FROM savings_goals`,
  ])

  const settingsRow = settingsRows[0]
  const settingsSnap: SettingsSnapshot | null = settingsRow
    ? {
        id: str(settingsRow.id) || 'default',
        budget: num(settingsRow.budget, 2500),
        currency: str(settingsRow.currency) || 'USD',
        seededAt:
          settingsRow.seeded_at == null ? null : num(settingsRow.seeded_at),
      }
    : null

  const monthly: MonthlyBudgetSnapshot[] = budgetRows.map((row) => ({
    yearMonth: str(row.year_month),
    budget: num(row.budget),
  }))

  const cats: CategorySnapshot[] = categoryRows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    type: str(row.type) === 'income' ? 'income' : 'expense',
    createdAt: num(row.created_at),
  }))

  const accs: AccountSnapshot[] = accountRows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    type: str(row.type) === 'liability' ? 'liability' : 'asset',
    startingBalance: num(row.starting_balance),
    closed: bool(row.closed),
    createdAt: num(row.created_at),
  }))

  const txs: TransactionSnapshot[] = txRows.map((row) => {
    const direction = strOrNull(row.transfer_direction)
    return {
      id: str(row.id),
      description: str(row.description),
      amount: num(row.amount),
      type:
        str(row.type) === 'income'
          ? 'income'
          : str(row.type) === 'transfer'
            ? 'transfer'
            : 'expense',
      transactionDate: str(row.transaction_date),
      categoryId: strOrNull(row.category_id),
      accountId: strOrNull(row.payment_method_id),
      sourceRecurringId: strOrNull(row.source_recurring_id),
      transferId: strOrNull(row.transfer_id),
      transferDirection:
        direction === 'in' || direction === 'out' ? direction : null,
      createdAt: num(row.created_at),
    }
  })

  const recurring: RecurringSnapshot[] = recurringRows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    kind: str(row.kind) === 'income' ? 'income' : 'expense',
    amount: num(row.amount),
    remainingAmount:
      row.remaining_amount == null ? null : num(row.remaining_amount),
    cadence:
      str(row.cadence) === 'weekly'
        ? 'weekly'
        : str(row.cadence) === 'yearly'
          ? 'yearly'
          : 'monthly',
    nextDate: str(row.next_date),
    active: bool(row.active),
    categoryId: str(row.category_id),
    accountId: strOrNull(row.payment_method_id),
    createdAt: num(row.created_at),
  }))

  const savings: SavingsSnapshot[] = savingsRows.map((row) => ({
    id: str(row.id),
    name: str(row.name),
    targetAmount: num(row.target_amount),
    currentAmount: num(row.current_amount),
    targetDate: strOrNull(row.target_date),
    categoryId: strOrNull(row.category_id),
    createdAt: num(row.created_at),
  }))

  return {
    settings: settingsSnap,
    monthlyBudgets: monthly,
    categories: cats,
    accounts: accs,
    transactions: txs,
    recurring,
    savings,
  }
}

export async function readLocalSnapshot(): Promise<BackupSnapshot> {
  await ensureDatabase()
  const client = await requireClientForMerge()
  return readSnapshotFromClient(client.sql.bind(client))
}

export async function readBackupFileSnapshot(
  file: File,
): Promise<BackupSnapshot> {
  const { SQLocalDrizzle } = await import('sqlocal/drizzle')
  const temp = new SQLocalDrizzle({ databasePath: ':memory:' })
  try {
    await temp.overwriteDatabaseFile(file)
    await temp.sql`PRAGMA foreign_keys = ON`
    await migrateSchema(temp)
    return await readSnapshotFromClient(temp.sql.bind(temp))
  } finally {
    await temp.destroy()
  }
}

async function applyPlan(plan: MergePlan) {
  const db = await getDb()

  if (plan.replaceSettings && plan.settings) {
    const seededAt = toDate(plan.settings.seededAt)
    await db
      .insert(settings)
      .values({
        id: plan.settings.id || 'default',
        budget: plan.settings.budget,
        currency: plan.settings.currency,
        seededAt: seededAt ?? undefined,
      })
      .onConflictDoUpdate({
        target: settings.id,
        set: {
          budget: plan.settings.budget,
          currency: plan.settings.currency,
          seededAt: seededAt,
        },
      })
  }

  for (const row of plan.monthlyBudgets) {
    await db
      .insert(monthlyBudgets)
      .values({ yearMonth: row.yearMonth, budget: row.budget })
      .onConflictDoNothing()
  }

  for (const { action, row } of plan.categories) {
    const values = {
      id: row.id,
      name: row.name,
      type: row.type,
      createdAt: toDate(row.createdAt) ?? new Date(0),
    }
    if (action === 'insert') {
      await db.insert(categories).values(values).onConflictDoNothing()
    } else {
      await db
        .update(categories)
        .set({ name: row.name, type: row.type, createdAt: values.createdAt })
        .where(eq(categories.id, row.id))
    }
  }

  for (const { action, row } of plan.accounts) {
    const values = {
      id: row.id,
      name: row.name,
      type: row.type,
      startingBalance: row.startingBalance,
      closed: row.closed,
      createdAt: toDate(row.createdAt) ?? new Date(0),
    }
    if (action === 'insert') {
      await db.insert(accounts).values(values).onConflictDoNothing()
    } else {
      await db
        .update(accounts)
        .set({
          name: row.name,
          type: row.type,
          startingBalance: row.startingBalance,
          closed: row.closed,
          createdAt: values.createdAt,
        })
        .where(eq(accounts.id, row.id))
    }
  }

  // Recurring/savings before transactions (FK order).
  for (const { action, row } of plan.recurring) {
    const values = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      amount: row.amount,
      remainingAmount: row.remainingAmount,
      cadence: row.cadence,
      nextDate: row.nextDate,
      active: row.active,
      categoryId: row.categoryId,
      accountId: row.accountId,
      createdAt: toDate(row.createdAt) ?? new Date(0),
    }
    if (action === 'insert') {
      await db.insert(recurringExpenses).values(values).onConflictDoNothing()
    } else {
      await db
        .update(recurringExpenses)
        .set({
          name: row.name,
          kind: row.kind,
          amount: row.amount,
          remainingAmount: row.remainingAmount,
          cadence: row.cadence,
          nextDate: row.nextDate,
          active: row.active,
          categoryId: row.categoryId,
          accountId: row.accountId,
          createdAt: values.createdAt,
        })
        .where(eq(recurringExpenses.id, row.id))
    }
  }

  for (const { action, row } of plan.savings) {
    const values = {
      id: row.id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      targetDate: row.targetDate,
      categoryId: row.categoryId,
      createdAt: toDate(row.createdAt) ?? new Date(0),
    }
    if (action === 'insert') {
      await db.insert(savingsGoals).values(values).onConflictDoNothing()
    } else {
      await db
        .update(savingsGoals)
        .set({
          name: row.name,
          targetAmount: row.targetAmount,
          currentAmount: row.currentAmount,
          targetDate: row.targetDate,
          categoryId: row.categoryId,
          createdAt: values.createdAt,
        })
        .where(eq(savingsGoals.id, row.id))
    }
  }

  for (const { action, row } of plan.transactions) {
    const values = {
      id: row.id,
      description: row.description,
      amount: row.amount,
      type: row.type,
      transactionDate: row.transactionDate,
      categoryId: row.categoryId,
      accountId: row.accountId,
      sourceRecurringId: row.sourceRecurringId,
      transferId: row.transferId,
      transferDirection: row.transferDirection,
      createdAt: toDate(row.createdAt) ?? new Date(0),
    }
    if (action === 'insert') {
      await db.insert(transactions).values(values).onConflictDoNothing()
    } else {
      await db
        .update(transactions)
        .set({
          description: row.description,
          amount: row.amount,
          type: row.type,
          transactionDate: row.transactionDate,
          categoryId: row.categoryId,
          accountId: row.accountId,
          sourceRecurringId: row.sourceRecurringId,
          transferId: row.transferId,
          transferDirection: row.transferDirection,
          createdAt: values.createdAt,
        })
        .where(eq(transactions.id, row.id))
    }
  }
}

export async function mergeBackupFile(file: File): Promise<MergeStats> {
  const [local, incoming] = await Promise.all([
    readLocalSnapshot(),
    readBackupFileSnapshot(file),
  ])
  const plan = planMerge(local, incoming)
  await applyPlan(plan)
  const stats = summarizeMergePlan(plan)
  stats.skipped = countSkipped(local, incoming, plan)
  return stats
}
