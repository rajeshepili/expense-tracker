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

/** Optional budget for a calendar month (YYYY-MM). Falls back to settings.budget */
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

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    type: text('type', { enum: ['expense', 'income'] })
      .notNull()
      .default('expense'),
    /** ISO date YYYY-MM-DD */
    transactionDate: text('transaction_date').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    paymentMethodId: text('payment_method_id').references(
      () => paymentMethods.id,
    ),
    /** Recurring bill id if created via Record (no FK). */
    sourceRecurringId: text('source_recurring_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_transactions_date').on(t.transactionDate, t.createdAt),
    index('idx_transactions_category').on(t.categoryId),
    index('idx_transactions_type').on(t.type),
    index('idx_transactions_category_date').on(t.categoryId, t.transactionDate),
    index('idx_transactions_source_recurring').on(t.sourceRecurringId),
    index('idx_transactions_method_date').on(t.paymentMethodId,
      t.transactionDate,
    ),
  ],
)

export const recurringExpenses = sqliteTable(
  'recurring_expenses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    /** Cycle amount; restored after full settle. */
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
    paymentMethodId: text('payment_method_id').references(
      () => paymentMethods.id,
    ),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_recurring_category').on(t.categoryId),
    index('idx_recurring_active_next').on(t.active, t.nextDate),
  ],
)
