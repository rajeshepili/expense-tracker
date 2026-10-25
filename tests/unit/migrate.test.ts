import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { listMigrationTags, migrateSchema } from '#/db/migrate'

/**
 * Pre-Drizzle OPFS shape: tables exist without later columns.
 * Opens through the legacy bridge, then stamps 0000_init.
 */
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
    expect(columnSet(db, 'recurring_expenses').has('remaining_amount')).toBe(
      true,
    )
    expect(indexNames(db).has('idx_transactions_source_recurring')).toBe(true)
    expect(appliedTags(db)).toBe(listMigrationTags().length)
  })

  it('upgrades a legacy v0 database via the bridge then stamps init', async () => {
    const { db, sql } = client(V0_SCHEMA)

    expect(columnSet(db, 'transactions').has('source_recurring_id')).toBe(false)

    await migrateSchema({ sql })

    expect(columnSet(db, 'transactions').has('source_recurring_id')).toBe(true)
    expect(columnSet(db, 'transactions').has('payment_method_id')).toBe(true)
    expect(columnSet(db, 'recurring_expenses').has('remaining_amount')).toBe(
      true,
    )
    expect(indexNames(db).has('idx_transactions_source_recurring')).toBe(true)
    expect(appliedTags(db)).toBeGreaterThanOrEqual(1)
  })

  it('is a no-op when migrations are already applied', async () => {
    const { db, sql } = client()
    await migrateSchema({ sql })
    await migrateSchema({ sql })
    expect(appliedTags(db)).toBe(listMigrationTags().length)
  })
})
