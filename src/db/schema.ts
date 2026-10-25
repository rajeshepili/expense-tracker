import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('default'),
  budget: real('budget').notNull().default(2500),
  currency: text('currency').notNull().default('USD'),
  seededAt: integer('seeded_at', { mode: 'timestamp' }),
})

/** Optional budget for a calendar month (YYYY-MM). Falls back to settings.budget. */
export const monthlyBudgets = sqliteTable('monthly_budgets', {
  yearMonth: text('year_month').primaryKey(),
  budget: real('budget').notNull(),
})

export const categories = sqliteTable('categories', {
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
})

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const transactions = sqliteTable('transactions', {
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
  paymentMethodId: text('payment_method_id').references(() => paymentMethods.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  cadence: text('cadence', { enum: ['weekly', 'monthly', 'yearly'] })
    .notNull()
    .default('monthly'),
  /** ISO date YYYY-MM-DD */
  nextDate: text('next_date').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
