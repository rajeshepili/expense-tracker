import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import type { SQLocalDrizzle } from 'sqlocal/drizzle'
import * as schema from './schema'

type AppDb = SqliteRemoteDatabase<typeof schema>

const DATABASE_PATH = 'expense-tracker.sqlite3'

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    budget REAL NOT NULL DEFAULT 2500,
    currency TEXT NOT NULL DEFAULT 'USD',
    seeded_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS monthly_budgets (
    year_month TEXT PRIMARY KEY,
    budget REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense',
    transaction_date TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    payment_method_id TEXT REFERENCES payment_methods(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    cadence TEXT NOT NULL DEFAULT 'monthly',
    next_date TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    category_id TEXT NOT NULL REFERENCES categories(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_category ON recurring_expenses(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recurring_active_next ON recurring_expenses(active, next_date)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_type_name ON categories(type, name)`,
] as const

let db: AppDb | null = null
let client: SQLocalDrizzle | null = null
let ready: Promise<AppDb> | null = null

function reset() {
  db = null
  client = null
  ready = null
}

async function openDatabase() {
  if (typeof window === 'undefined') {
    throw new Error('Local database is only available in the browser')
  }
  if (db && client) return db

  const [{ SQLocalDrizzle }, { drizzle }] = await Promise.all([
    import('sqlocal/drizzle'),
    import('drizzle-orm/sqlite-proxy'),
  ])

  const next = new SQLocalDrizzle({
    databasePath: DATABASE_PATH,
    onInit: (sql) => SCHEMA_STATEMENTS.map((statement) => sql(statement)),
  })
  await next.sql`SELECT 1`

  client = next
  db = drizzle(next.driver, next.batchDriver, { schema })
  return db
}

/** Start WASM/worker immediately (safe to call multiple times). */
export function warmDatabase() {
  if (typeof window === 'undefined') return
  if (!ready) {
    ready = openDatabase().catch((error) => {
      reset()
      throw error
    })
  }
}

export async function getDb() {
  warmDatabase()
  return ready!
}

export async function ensureDatabase() {
  await getDb()
}

async function requireClient() {
  await ensureDatabase()
  if (!client) throw new Error('Local database client is not ready')
  return client
}

export async function exportDatabaseFile() {
  return (await requireClient()).getDatabaseFile()
}

/** Replace the on-device DB. Caller should reload afterward. */
export async function importDatabaseFile(file: File) {
  await (await requireClient()).overwriteDatabaseFile(file)
  reset()
}

if (typeof window !== 'undefined') {
  warmDatabase()
}
