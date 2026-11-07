import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('default'),
  budget: real('budget').notNull().default(2500),
  currency: text('currency').notNull().default('USD'),
  seededAt: integer('seeded_at', { mode: 'timestamp' }),
})

/** Per-month override; falls back to settings.budget. Key is YYYY-MM. */
export const monthlyBudgets = sqliteTable('monthly_budgets', {
  yearMonth: text('year_month').primaryKey(),
  budget: real('budget').notNull(),
})

export const categories = sqliteTable(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] })
      .notNull()
      .default('expense'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_categories_type_name').on(t.type, t.name)],
)

export const accounts = sqliteTable('payment_methods', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: text('type', { enum: ['asset', 'liability'] })
    .notNull()
    .default('asset'),
  startingBalance: real('starting_balance').notNull().default(0),
  closed: integer('closed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

/** @deprecated use `accounts` */
export const paymentMethods = accounts

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    type: text('type', { enum: ['expense', 'income', 'transfer'] })
      .notNull()
      .default('expense'),
    /** ISO date YYYY-MM-DD */
    transactionDate: text('transaction_date').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    accountId: text('payment_method_id').references(() => accounts.id),
    /** Recurring bill id if created via Record (no FK). */
    sourceRecurringId: text('source_recurring_id'),
    /** Peer leg of a paired transfer (no FK; enforced in repo). */
    transferId: text('transfer_id'),
    /** `out` or `in` when type is transfer */
    transferDirection: text('transfer_direction', { enum: ['out', 'in'] }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_transactions_date').on(t.transactionDate, t.createdAt),
    // Covering index for month/year summaries: date range + type + amount,
    // so aggregates never touch the table rows.
    index('idx_transactions_date_type_amount').on(
      t.transactionDate,
      t.type,
      t.amount,
    ),
    index('idx_transactions_category').on(t.categoryId),
    index('idx_transactions_category_date').on(t.categoryId, t.transactionDate),
    index('idx_transactions_source_recurring').on(t.sourceRecurringId),
    index('idx_transactions_account_date').on(t.accountId,
      t.transactionDate,
    ),
    index('idx_transactions_transfer').on(t.transferId),
  ],
)

export const recurringExpenses = sqliteTable(
  'recurring_expenses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['expense', 'income'] })
      .notNull()
      .default('expense'),
    amount: real('amount').notNull(),
    /** Still owed this cycle; null = due equals amount. */
    remainingAmount: real('remaining_amount'),
    cadence: text('cadence', { enum: ['weekly', 'monthly', 'yearly'] })
      .notNull()
      .default('monthly'),
    /** ISO date YYYY-MM-DD */
    nextDate: text('next_date').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    accountId: text('payment_method_id').references(() => accounts.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_recurring_category').on(t.categoryId),
    index('idx_recurring_active_next').on(t.active, t.nextDate),
  ],
)

export const savingsGoals = sqliteTable(
  'savings_goals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    targetAmount: real('target_amount').notNull(),
    currentAmount: real('current_amount').notNull().default(0),
    targetDate: text('target_date'),
    categoryId: text('category_id').references(() => categories.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('idx_savings_category').on(t.categoryId)],
)
