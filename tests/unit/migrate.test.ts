import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { listMigrationTags, migrateSchema } from '#/db/migrate'
import { orphanTransferIds } from '#/lib/finance'

const V0_SCHEMA = `
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
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE recurring_expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  next_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  category_id TEXT NOT NULL REFERENCES categories(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`

function openClient(sqlText?: string) {
  const db = new Database(':memory:')
  if (sqlText) db.exec(sqlText)

  const sql = (async (
    queryTemplate: TemplateStringsArray | string,
    ...params: unknown[]
  ) => {
    const statement =
      typeof queryTemplate === 'string'
        ? queryTemplate
        : queryTemplate.reduce(
            (acc, part, i) => acc + part + (i < params.length ? '?' : ''),
            '',
          )
    const trimmed = statement.trim().toLowerCase()
    const isRead =
      trimmed.startsWith('select') ||
      trimmed.startsWith('with') ||
      (trimmed.startsWith('pragma') && !trimmed.includes('='))
    if (isRead) {
      return db.prepare(statement).all(...params) as Record<string, unknown>[]
    }
    db.prepare(statement).run(...params)
    return []
  }) as Parameters<typeof migrateSchema>[0]['sql']

  return { db, sql }
}

const openDbs: InstanceType<typeof Database>[] = []

function client(sqlText?: string) {
  const opened = openClient(sqlText)
  openDbs.push(opened.db)
  return opened
}

afterEach(() => {
  while (openDbs.length) openDbs.pop()?.close()
})

function columnSet(db: InstanceType<typeof Database>, table: string) {
  return new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
      (row) => row.name,
    ),
  )
}

function indexNames(db: InstanceType<typeof Database>) {
  return new Set(
    (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as { name: string }[]
    ).map((row) => row.name),
  )
}

function appliedTags(db: InstanceType<typeof Database>) {
  return (
    db
      .prepare(
        `SELECT created_at FROM __drizzle_migrations ORDER BY created_at ASC`,
      )
      .all() as { created_at: number }[]
  ).length
}

describe('migrateSchema', () => {
  it('bundles the generated Drizzle Kit journal', () => {
    expect(listMigrationTags()).toContain('0000_init')
  })

  it('creates the full schema on an empty database', async () => {
    const { db, sql } = client()
    await migrateSchema({ sql })

    expect(columnSet(db, 'transactions').has('source_recurring_id')).toBe(true)
    expect(columnSet(db, 'transactions').has('transfer_id')).toBe(true)
    expect(columnSet(db, 'transactions').has('transfer_direction')).toBe(true)
    expect(columnSet(db, 'payment_methods').has('type')).toBe(true)
    expect(columnSet(db, 'payment_methods').has('starting_balance')).toBe(true)
    expect(columnSet(db, 'payment_methods').has('closed')).toBe(true)
    expect(columnSet(db, 'recurring_expenses').has('remaining_amount')).toBe(
      true,
    )
    expect(indexNames(db).has('idx_transactions_source_recurring')).toBe(true)
    expect(indexNames(db).has('idx_transactions_transfer')).toBe(true)
    expect(indexNames(db).has('idx_transactions_account_date')).toBe(true)
    expect(appliedTags(db)).toBe(listMigrationTags().length)
  })

  it('backfills credit card accounts as liabilities on 0002', async () => {
    const after0001 = `
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
  source_recurring_id TEXT,
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
`
    const { db, sql } = client(after0001)
    db.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric
      );
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', 1792967982361);
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', 1793089418505);
    `)
    db.prepare(
      `INSERT INTO payment_methods (id, name) VALUES (?, ?), (?, ?)`,
    ).run('pm-card', 'Credit card', 'pm-cash', 'Cash')

    await migrateSchema({ sql })

    const card = db
      .prepare(
        `SELECT type, starting_balance, closed FROM payment_methods WHERE id = ?`,
      )
      .get('pm-card') as {
      type: string
      starting_balance: number
      closed: number
    }
    const cash = db
      .prepare(`SELECT type FROM payment_methods WHERE id = ?`)
      .get('pm-cash') as { type: string }
    expect(card.type).toBe('liability')
    expect(card.starting_balance).toBe(0)
    expect(card.closed).toBe(0)
    expect(cash.type).toBe('asset')
    expect(columnSet(db, 'transactions').has('transfer_id')).toBe(true)
  })

  it('upgrades a legacy v0 database via the bridge then stamps init', async () => {
    const { db, sql } = client(V0_SCHEMA)

    expect(columnSet(db, 'transactions').has('source_recurring_id')).toBe(false)

    await migrateSchema({ sql })

    expect(columnSet(db, 'transactions').has('source_recurring_id')).toBe(true)
    expect(columnSet(db, 'transactions').has('payment_method_id')).toBe(true)
    expect(columnSet(db, 'transactions').has('transfer_id')).toBe(true)
    expect(columnSet(db, 'payment_methods').has('type')).toBe(true)
    expect(columnSet(db, 'recurring_expenses').has('remaining_amount')).toBe(
      true,
    )
    expect(indexNames(db).has('idx_transactions_source_recurring')).toBe(true)
    expect(indexNames(db).has('idx_transactions_transfer')).toBe(true)
    expect(appliedTags(db)).toBeGreaterThanOrEqual(1)
  })

  it('is a no-op when migrations are already applied', async () => {
    const { db, sql } = client()
    await migrateSchema({ sql })
    await migrateSchema({ sql })
    expect(appliedTags(db)).toBe(listMigrationTags().length)
  })

  it('repairs orphan transfers after migrate (smoke)', async () => {
    const { db, sql } = client()
    await migrateSchema({ sql })

    db.prepare(
      `INSERT INTO payment_methods (id, name) VALUES (?, ?), (?, ?)`,
    ).run('a1', 'Checking', 'a2', 'Cash')
    db.prepare(
      `
      INSERT INTO transactions (
        id, description, amount, type, transaction_date,
        payment_method_id, transfer_id, transfer_direction
      ) VALUES
        ('orphan-out', 'Broken out', 10, 'transfer', '2026-03-01', 'a1', 'missing-peer', 'out'),
        ('good-out', 'Out', 5, 'transfer', '2026-03-02', 'a1', 'good-in', 'out'),
        ('good-in', 'In', 5, 'transfer', '2026-03-02', 'a2', 'good-out', 'in')
    `,
    ).run()

    const rows = db
      .prepare(
        `SELECT id, transfer_id as transferId, transfer_direction as transferDirection, type
         FROM transactions WHERE type = 'transfer'`,
      )
      .all() as Array<{
      id: string
      transferId: string | null
      transferDirection: string | null
      type: string
    }>

    const orphans = orphanTransferIds(rows)
    for (const id of orphans) {
      db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id)
    }

    expect(orphans).toEqual(['orphan-out'])
    const remaining = db
      .prepare(
        `SELECT id FROM transactions WHERE type = 'transfer' ORDER BY id`,
      )
      .all() as Array<{ id: string }>
    expect(remaining.map((row) => row.id)).toEqual(['good-in', 'good-out'])
  })
})
