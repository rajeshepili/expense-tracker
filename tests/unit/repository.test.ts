import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyContribution,
  normalizeSavingsGoalCreate,
  normalizeSavingsGoalUpdate,
} from '#/lib/savings'

const CURRENT_SCHEMA = `
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  budget REAL NOT NULL DEFAULT 2500,
  currency TEXT NOT NULL DEFAULT 'USD',
  seeded_at INTEGER
);
CREATE TABLE monthly_budgets (
  year_month TEXT PRIMARY KEY,
  budget REAL NOT NULL
);
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  transaction_date TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  payment_method_id TEXT REFERENCES payment_methods(id),
  source_recurring_id TEXT REFERENCES recurring_expenses(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE recurring_expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  remaining_amount REAL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  next_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  category_id TEXT NOT NULL REFERENCES categories(id),
  payment_method_id TEXT REFERENCES payment_methods(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE savings_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  category_id TEXT REFERENCES categories(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_savings_category ON savings_goals(category_id);
`

const openDbs: InstanceType<typeof Database>[] = []

function client(sqlText?: string) {
  const db = new Database(':memory:')
  if (sqlText) db.exec(sqlText)
  openDbs.push(db)
  return db
}

afterEach(() => {
  while (openDbs.length) openDbs.pop()?.close()
})

function seedBasics(db: InstanceType<typeof Database>) {
  db.prepare(`
    INSERT OR REPLACE INTO settings (id, budget, currency)
    VALUES ('default', 2000, 'USD')
  `).run()

  const catId = 'cat-food'
  db.prepare(`INSERT INTO categories (id, name, type) VALUES (?, ?, ?)`).run(catId, 'Food', 'expense')

  const catSalary = 'cat-salary'
  db.prepare(`INSERT INTO categories (id, name, type) VALUES (?, ?, ?)`).run(catSalary, 'Salary', 'income')

  const methodId = 'method-cash'
  db.prepare(`INSERT INTO payment_methods (id, name) VALUES (?, ?)`).run(methodId, 'Cash')

  const billId = 'bill-1'
  db.prepare(`
    INSERT INTO recurring_expenses (id, name, amount, cadence, next_date, active, category_id, payment_method_id)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(billId, 'Rent', 1200, 'monthly', '2026-03-15', catId, methodId)

  return { catId, catSalary, methodId, billId }
}

// --- finance helpers replicated for direct SQL testing ---

interface RecurringBillRow {
  id: string
  name: string
  amount: number
  remaining_amount: number | null
  cadence: string
  next_date: string
  active: number
  category_id: string
  payment_method_id: string | null
}

function advanceRecurringDate(isoDate: string, cadence: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const date = new Date(Date.UTC(year, month - 1, day))
  if (cadence === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7)
  } else if (cadence === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + 1)
  } else {
    const targetDay = day
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() + 1)
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(targetDay, lastDay))
  }
  return date.toISOString().slice(0, 10)
}

function settleRecurringPayment(due: number, amount: number) {
  if (amount >= due) return { kind: 'settled' as const }
  return { kind: 'partial' as const, remaining: due - amount }
}

function amountDue(bill: { amount: number; remaining_amount: number | null }) {
  return bill.remaining_amount ?? bill.amount
}

// --- record recurring payment logic ---

function recordRecurringPayment(db: InstanceType<typeof Database>, id: string, overrides: {
  amount?: number
  date?: string
  paymentMethodId?: string | null
  force?: boolean
} = {}) {
  const bill = db.prepare(`SELECT * FROM recurring_expenses WHERE id = ?`).get(id) as RecurringBillRow | undefined

  if (!bill) throw new Error('Recurring bill not found')
  if (!bill.active) throw new Error('This bill is paused')

  const recordDate = overrides.date ?? bill.next_date
  const due = amountDue(bill)
  const amount = overrides.amount ?? due
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid amount (0 or more)')
  }

  const priorLinked = db.prepare(`
    SELECT transaction_date as date FROM transactions
    WHERE source_recurring_id = ?
    ORDER BY transaction_date DESC
    LIMIT 1
  `).get(id) as { date: string } | undefined

  const hasPaymentThisCycle = Boolean(priorLinked && priorLinked.date >= bill.next_date)
  const cycleOpen = bill.remaining_amount !== null && bill.remaining_amount > 0
  const alreadyRecorded = hasPaymentThisCycle && !cycleOpen
  if (alreadyRecorded && !overrides.force) {
    return { ok: false as const, reason: 'already_recorded' as const, nextDate: bill.next_date }
  }

  const settlement = settleRecurringPayment(due, amount)

  const txId = `tx-${crypto.randomUUID()}`
  db.prepare(`
    INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, source_recurring_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(txId, bill.name, amount, 'expense', recordDate, bill.category_id, overrides.paymentMethodId ?? bill.payment_method_id, id, Date.now())

  if (settlement.kind === 'partial') {
    db.prepare(`UPDATE recurring_expenses SET remaining_amount = ? WHERE id = ?`).run(settlement.remaining, id)
    return { ok: true as const, transactionId: txId, nextDate: bill.next_date, alreadyRecorded: false, partial: true, remainingAmount: settlement.remaining }
  }

  const nextDate = advanceRecurringDate(recordDate, bill.cadence)
  db.prepare(`UPDATE recurring_expenses SET next_date = ?, remaining_amount = NULL WHERE id = ?`).run(nextDate, id)
  return { ok: true as const, transactionId: txId, nextDate, alreadyRecorded: false, partial: false, remainingAmount: null }
}

// --- skip recurring ---

function skipRecurringOccurrence(db: InstanceType<typeof Database>, id: string) {
  const bill = db.prepare(`SELECT * FROM recurring_expenses WHERE id = ?`).get(id) as {
    next_date: string
    cadence: string
  } | undefined
  if (!bill) throw new Error('Recurring bill not found')
  const nextDate = advanceRecurringDate(bill.next_date, bill.cadence)
  db.prepare(`UPDATE recurring_expenses SET next_date = ?, remaining_amount = NULL WHERE id = ?`).run(nextDate, id)
  return { nextDate }
}

// --- getOverview ---

function getOverview(db: InstanceType<typeof Database>, yearMonth: string) {
  const monthPrefix = `${yearMonth}%`

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
    FROM transactions
    WHERE transaction_date LIKE ?
  `).get(monthPrefix) as { income: number; expenses: number }

  const settings = db.prepare(`SELECT * FROM settings WHERE id = 'default'`).get() as { budget: number; currency: string } | undefined

  const monthBudget = db.prepare(`SELECT * FROM monthly_budgets WHERE year_month = ?`).get(yearMonth) as { budget: number } | undefined

  return {
    summary,
    settings,
    monthBudget: {
      yearMonth,
      defaultBudget: settings?.budget ?? 2000,
      budget: monthBudget?.budget ?? settings?.budget ?? 2000,
      isCustom: Boolean(monthBudget),
    },
  }
}

function setMonthBudget(db: InstanceType<typeof Database>, yearMonth: string, budget: number) {
  db.prepare(`
    INSERT INTO monthly_budgets (year_month, budget)
    VALUES (?, ?)
    ON CONFLICT(year_month) DO UPDATE SET budget = excluded.budget
  `).run(yearMonth, budget)
  return getOverview(db, yearMonth).monthBudget
}

function clearMonthBudget(db: InstanceType<typeof Database>, yearMonth: string) {
  db.prepare(`DELETE FROM monthly_budgets WHERE year_month = ?`).run(yearMonth)
  return getOverview(db, yearMonth).monthBudget
}

function monthBudgetMatchesDefault(monthBudget: number, defaultBudget: number) {
  return monthBudget === defaultBudget
}

// --- delete category ---

function deleteCategory(db: InstanceType<typeof Database>, id: string, replacementId: string) {
  db.prepare(`UPDATE transactions SET category_id = ? WHERE category_id = ?`).run(replacementId, id)
  db.prepare(`UPDATE recurring_expenses SET category_id = ? WHERE category_id = ?`).run(replacementId, id)
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(id)
}

describe('recordRecurringPayment (SQL)', () => {
  it('records full settlement and advances next_date', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    const result = recordRecurringPayment(db, 'bill-1', { amount: 1200, date: '2026-03-15', paymentMethodId: 'method-cash' })

    expect(result.ok).toBe(true)
    expect(result.partial).toBe(false)
    expect(result.remainingAmount).toBeNull()
    expect(result.nextDate).toBe('2026-04-15')

    const tx = db.prepare(`SELECT * FROM transactions WHERE source_recurring_id = ?`).get('bill-1') as { amount: number } | undefined
    expect(tx).toBeDefined()
    expect(tx?.amount).toBe(1200)

    const bill = db.prepare(`SELECT * FROM recurring_expenses WHERE id = ?`).get('bill-1') as { next_date: string; remaining_amount: number | null } | undefined
    expect(bill?.next_date).toBe('2026-04-15')
    expect(bill?.remaining_amount).toBeNull()
  })

  it('records partial payment and leaves remaining_amount', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    const result = recordRecurringPayment(db, 'bill-1', { amount: 500, date: '2026-03-15' })

    expect(result.ok).toBe(true)
    expect(result.partial).toBe(true)
    expect(result.remainingAmount).toBe(700)

    const bill = db.prepare(`SELECT * FROM recurring_expenses WHERE id = ?`).get('bill-1') as { remaining_amount: number | null; next_date: string } | undefined
    expect(bill?.remaining_amount).toBe(700)
    expect(bill?.next_date).toBe('2026-03-15')
  })

  it('allows another payment in same cycle after partial (cycle stays open)', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    // First payment is partial (doesn't advance next_date)
    recordRecurringPayment(db, 'bill-1', { amount: 500, date: '2026-03-15' })

    // Second payment in same cycle (next_date still 2026-03-15) - should succeed because cycle is open
    const result = recordRecurringPayment(db, 'bill-1', { amount: 700, date: '2026-03-15' })

    expect(result.ok).toBe(true)
    expect(result.partial).toBe(false)
    expect(result.remainingAmount).toBeNull()
    expect(result.nextDate).toBe('2026-04-15')
  })

  it('records second payment in next cycle (advances after full)', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    // First payment fully settles March
    recordRecurringPayment(db, 'bill-1', { amount: 1200, date: '2026-03-15' })

    // Second payment for April cycle (next_date is now 2026-04-15)
    // Using date in April cycle should work
    const result = recordRecurringPayment(db, 'bill-1', {
      amount: 1200,
      date: '2026-04-15',
    })

    expect(result.ok).toBe(true)

    const count = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE source_recurring_id = ?`).get('bill-1') as { c: number } | undefined
    expect(count?.c).toBe(2)
  })
})

describe('skipRecurringOccurrence (SQL)', () => {
  it('advances next_date and clears remaining_amount', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    db.prepare(`UPDATE recurring_expenses SET remaining_amount = ? WHERE id = ?`).run(700, 'bill-1')

    const result = skipRecurringOccurrence(db, 'bill-1')

    expect(result.nextDate).toBe('2026-04-15')

    const bill = db.prepare(`SELECT * FROM recurring_expenses WHERE id = ?`).get('bill-1') as { next_date: string; remaining_amount: number | null } | undefined
    expect(bill?.next_date).toBe('2026-04-15')
    expect(bill?.remaining_amount).toBeNull()
  })
})

describe('getOverview month summaries (SQL)', () => {
  it('summarizes income/expenses for the given month', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, source_recurring_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx-1', 'Salary', 3000, 'income', '2026-03-01', 'cat-salary', 'method-cash', null, 1709251200000)

    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, source_recurring_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx-2', 'Food', 150, 'expense', '2026-03-10', 'cat-food', 'method-cash', null, 1709337600000)

    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, source_recurring_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx-3', 'Rent from bill', 1200, 'expense', '2026-03-15', 'cat-food', 'method-cash', 'bill-1', 1709424000000)

    // April transaction (should not count)
    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, source_recurring_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx-4', 'April food', 200, 'expense', '2026-04-01', 'cat-food', 'method-cash', null, 1711843200000)

    const overview = getOverview(db, '2026-03')

    expect(overview.summary.income).toBe(3000)
    expect(overview.summary.expenses).toBe(1350)
  })

  it('resolves month budget: custom > default', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    db.prepare(`INSERT INTO monthly_budgets (year_month, budget) VALUES (?, ?)`).run('2026-03', 2500)

    const overview = getOverview(db, '2026-03')

    expect(overview.monthBudget.budget).toBe(2500)
    expect(overview.monthBudget.isCustom).toBe(true)
    expect(overview.monthBudget.defaultBudget).toBe(2000)
  })
})

describe('month budget override (SQL)', () => {
  it('setMonthBudget creates custom budget for a month', async () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    const result = await setMonthBudget(db, '2026-05', 3000)

    expect(result.budget).toBe(3000)
    expect(result.isCustom).toBe(true)
    expect(result.defaultBudget).toBe(2000)
    expect(result.yearMonth).toBe('2026-05')

    const row = db.prepare(`SELECT * FROM monthly_budgets WHERE year_month = ?`).get('2026-05') as { year_month: string; budget: number } | undefined
    expect(row?.budget).toBe(3000)
  })

  it('setMonthBudget updates existing custom budget', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    db.prepare(`INSERT INTO monthly_budgets (year_month, budget) VALUES (?, ?)`).run('2026-03', 2500)

    const result = setMonthBudget(db, '2026-03', 3500)

    expect(result.budget).toBe(3500)
    expect(result.isCustom).toBe(true)

    const row = db.prepare(`SELECT * FROM monthly_budgets WHERE year_month = ?`).get('2026-03') as { budget: number } | undefined
    expect(row?.budget).toBe(3500)
  })

  it('clearMonthBudget removes custom budget and falls back to default', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    db.prepare(`INSERT INTO monthly_budgets (year_month, budget) VALUES (?, ?)`).run('2026-03', 2500)

    const before = getOverview(db, '2026-03')
    expect(before.monthBudget.budget).toBe(2500)
    expect(before.monthBudget.isCustom).toBe(true)

    clearMonthBudget(db, '2026-03')

    const after = getOverview(db, '2026-03')
    expect(after.monthBudget.budget).toBe(2000)
    expect(after.monthBudget.isCustom).toBe(false)
    expect(after.monthBudget.defaultBudget).toBe(2000)

    const row = db.prepare(`SELECT * FROM monthly_budgets WHERE year_month = ?`).get('2026-03')
    expect(row).toBeUndefined()
  })

  it('getOverview falls back to default when no custom budget', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    const overview = getOverview(db, '2026-07')

    expect(overview.monthBudget.budget).toBe(2000)
    expect(overview.monthBudget.isCustom).toBe(false)
    expect(overview.monthBudget.defaultBudget).toBe(2000)
  })

  it('monthBudgetMatchesDefault returns true when equal', () => {
    expect(monthBudgetMatchesDefault(2000, 2000)).toBe(true)
    expect(monthBudgetMatchesDefault(2500, 2000)).toBe(false)
  })
})

describe('category delete with reassignment (SQL)', () => {
  it('reassigns transactions and recurring to replacement category', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)

    const catId2 = 'cat-transport'
    db.prepare(`INSERT INTO categories (id, name, type) VALUES (?, ?, ?)`).run(catId2, 'Transport', 'expense')

    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('tx-1', 'Food', 100, 'expense', '2026-03-01', 'cat-food', 1709251200000)

    deleteCategory(db, 'cat-food', catId2)

    const tx = db.prepare(`SELECT category_id FROM transactions WHERE id = ?`).get('tx-1') as { category_id: string } | undefined
    expect(tx?.category_id).toBe(catId2)

    const bill = db.prepare(`SELECT category_id FROM recurring_expenses WHERE id = ?`).get('bill-1') as { category_id: string } | undefined
    expect(bill?.category_id).toBe(catId2)

    const cat = db.prepare(`SELECT * FROM categories WHERE id = ?`).get('cat-food')
    expect(cat).toBeUndefined()
  })
})

// --- savings goals (mirrors repository write path) ---

function createSavingsGoal(
  db: InstanceType<typeof Database>,
  input: {
    id: string
    name: string
    targetAmount: number
    currentAmount?: number
    targetDate?: string | null
    categoryId?: string | null
  },
) {
  const values = normalizeSavingsGoalCreate(input)
  db.prepare(`
    INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, category_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    values.name,
    values.targetAmount,
    values.currentAmount,
    values.targetDate,
    values.categoryId,
  )
  return { id: input.id }
}

function updateSavingsGoal(
  db: InstanceType<typeof Database>,
  id: string,
  input: {
    name?: string
    targetAmount?: number
    currentAmount?: number
    targetDate?: string | null
    categoryId?: string | null
  },
) {
  const existing = db
    .prepare(
      `SELECT target_amount as targetAmount, current_amount as currentAmount FROM savings_goals WHERE id = ?`,
    )
    .get(id) as { targetAmount: number; currentAmount: number } | undefined
  if (!existing) throw new Error('Savings goal not found')

  const updates = normalizeSavingsGoalUpdate(input, existing)
  if (!updates) return { success: true as const }

  const next = {
    name: updates.name,
    targetAmount: updates.targetAmount ?? existing.targetAmount,
    currentAmount: updates.currentAmount ?? existing.currentAmount,
    targetDate: updates.targetDate,
    categoryId: updates.categoryId,
  }

  // Apply only provided fields (same shape repository sets).
  if (updates.name !== undefined) {
    db.prepare(`UPDATE savings_goals SET name = ? WHERE id = ?`).run(updates.name, id)
  }
  if (updates.targetAmount !== undefined || updates.currentAmount !== undefined) {
    db.prepare(
      `UPDATE savings_goals SET target_amount = ?, current_amount = ? WHERE id = ?`,
    ).run(next.targetAmount, next.currentAmount, id)
  }
  if (updates.targetDate !== undefined) {
    db.prepare(`UPDATE savings_goals SET target_date = ? WHERE id = ?`).run(
      updates.targetDate,
      id,
    )
  }
  if (updates.categoryId !== undefined) {
    db.prepare(`UPDATE savings_goals SET category_id = ? WHERE id = ?`).run(
      updates.categoryId,
      id,
    )
  }
  return { success: true as const }
}

function recordSavingsContribution(
  db: InstanceType<typeof Database>,
  id: string,
  amount: number,
) {
  const goal = db
    .prepare(
      `SELECT target_amount as targetAmount, current_amount as currentAmount FROM savings_goals WHERE id = ?`,
    )
    .get(id) as { targetAmount: number; currentAmount: number } | undefined
  if (!goal) throw new Error('Savings goal not found')

  const currentAmount = applyContribution(goal, amount)
  if (currentAmount === goal.currentAmount) {
    return { currentAmount }
  }

  db.prepare(`UPDATE savings_goals SET current_amount = ? WHERE id = ?`).run(
    currentAmount,
    id,
  )
  return { currentAmount }
}

function listSavingsGoals(db: InstanceType<typeof Database>) {
  return db
    .prepare(
      `
      SELECT
        g.id,
        g.name,
        g.target_amount as targetAmount,
        g.current_amount as currentAmount,
        g.target_date as targetDate,
        g.category_id as categoryId,
        c.name as category
      FROM savings_goals g
      LEFT JOIN categories c ON c.id = g.category_id
      ORDER BY g.created_at DESC
    `,
    )
    .all() as Array<{
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    targetDate: string | null
    categoryId: string | null
    category: string | null
  }>
}

describe('savings goals (SQL)', () => {
  it('creates with clamped current and lists category name', () => {
    const db = client(CURRENT_SCHEMA)
    const { catSalary } = seedBasics(db)

    createSavingsGoal(db, {
      id: 'goal-1',
      name: '  Emergency  ',
      targetAmount: 1000,
      currentAmount: 1500,
      categoryId: catSalary,
    })

    const rows = listSavingsGoals(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'goal-1',
      name: 'Emergency',
      targetAmount: 1000,
      currentAmount: 1000,
      categoryId: catSalary,
      category: 'Salary',
    })
  })

  it('records contributions and clamps at target', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)
    createSavingsGoal(db, {
      id: 'goal-1',
      name: 'Bike',
      targetAmount: 100,
      currentAmount: 80,
    })

    expect(recordSavingsContribution(db, 'goal-1', 10)).toEqual({
      currentAmount: 90,
    })
    expect(recordSavingsContribution(db, 'goal-1', 50)).toEqual({
      currentAmount: 100,
    })

    const row = db
      .prepare(`SELECT current_amount FROM savings_goals WHERE id = ?`)
      .get('goal-1') as { current_amount: number }
    expect(row.current_amount).toBe(100)
  })

  it('skips no-op write when already complete', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)
    createSavingsGoal(db, {
      id: 'goal-1',
      name: 'Done',
      targetAmount: 50,
      currentAmount: 50,
    })

    expect(recordSavingsContribution(db, 'goal-1', 10)).toEqual({
      currentAmount: 50,
    })
  })

  it('rejects invalid contribution amounts', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)
    createSavingsGoal(db, {
      id: 'goal-1',
      name: 'Trip',
      targetAmount: 200,
    })

    expect(() => recordSavingsContribution(db, 'goal-1', 0)).toThrow(
      /greater than 0/,
    )
    expect(() => recordSavingsContribution(db, 'missing', 10)).toThrow(
      /not found/,
    )
  })

  it('clamps current when target shrinks on update', () => {
    const db = client(CURRENT_SCHEMA)
    seedBasics(db)
    createSavingsGoal(db, {
      id: 'goal-1',
      name: 'Trip',
      targetAmount: 500,
      currentAmount: 400,
    })

    updateSavingsGoal(db, 'goal-1', { targetAmount: 300 })

    const row = db
      .prepare(
        `SELECT target_amount, current_amount FROM savings_goals WHERE id = ?`,
      )
      .get('goal-1') as { target_amount: number; current_amount: number }
    expect(row.target_amount).toBe(300)
    expect(row.current_amount).toBe(300)
  })
})