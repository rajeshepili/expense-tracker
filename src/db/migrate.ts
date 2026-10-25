import type { SQLocalDrizzle } from 'sqlocal/drizzle'
import migrations from '../../drizzle/migrations.js'

/**
 * Schema changes: edit `src/db/schema.ts`, then `pnpm db:generate`.
 * Do not hand-edit SQL except the frozen legacy bridge below.
 */

type SqlClient = Pick<SQLocalDrizzle, 'sql'>

type JournalEntry = {
  idx: number
  when: number
  tag: string
  breakpoints: boolean
}

type BundledMigrations = {
  journal: { entries: JournalEntry[] }
  migrations: Record<string, string>
}

const bundled = migrations as BundledMigrations

function migrationKey(idx: number) {
  return `m${idx.toString().padStart(4, '0')}`
}

async function execSql(client: SqlClient, statement: string) {
  const trimmed = statement.trim()
  if (!trimmed) return
  await client.sql(trimmed)
}

async function lastAppliedWhen(client: SqlClient) {
  const rows = await client.sql<{ created_at: number | string }>`
    SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1
  `
  if (!rows[0]) return null
  return Number(rows[0].created_at)
}

async function stamp(client: SqlClient, entry: JournalEntry) {
  await client.sql`
    INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${''}, ${entry.when})
  `
}

/**
 * One-time bridge for OPFS DBs created before Drizzle Kit migrations.
 * Brings them to the 0000_init shape, then stamps only that migration.
 * Do not extend this — new columns go through `pnpm db:generate`.
 */
async function legacyBridgeToInit(client: SqlClient) {
  const ensureColumn = async (
    table: 'transactions' | 'recurring_expenses',
    column: string,
    definition: string,
  ) => {
    const rows =
      table === 'transactions'
        ? await client.sql<{ name: string }>`PRAGMA table_info(transactions)`
        : await client.sql<{ name: string }>`PRAGMA table_info(recurring_expenses)`
    if (rows.some((row) => row.name === column)) return
    await execSql(client, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }

  await ensureColumn('transactions', 'payment_method_id', 'TEXT')
  await ensureColumn('transactions', 'source_recurring_id', 'TEXT')
  await ensureColumn('recurring_expenses', 'payment_method_id', 'TEXT')
  await ensureColumn('recurring_expenses', 'remaining_amount', 'REAL')

  for (const statement of [
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, transaction_date)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_source_recurring ON transactions(source_recurring_id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_method_date ON transactions(payment_method_id, transaction_date)`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_category ON recurring_expenses(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_active_next ON recurring_expenses(active, next_date)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_type_name ON categories(type, name)`,
  ]) {
    await execSql(client, statement)
  }
}

async function applyEntry(client: SqlClient, entry: JournalEntry) {
  const body = bundled.migrations[migrationKey(entry.idx)]
  if (!body) throw new Error(`Missing migration: ${entry.tag}`)
  for (const statement of body.split('--> statement-breakpoint')) {
    await execSql(client, statement)
  }
  await stamp(client, entry)
}

/** Apply pending Drizzle Kit migrations (bundled journal). */
export async function migrateSchema(client: SqlClient) {
  await client.sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `

  const settings = await client.sql`
    SELECT 1 AS ok FROM sqlite_master
    WHERE type = 'table' AND name = 'settings'
    LIMIT 1
  `
  let appliedWhen = await lastAppliedWhen(client)

  if (settings.length > 0 && appliedWhen === null) {
    await legacyBridgeToInit(client)
    const init = bundled.journal.entries[0]
    if (!init) throw new Error('No migrations in drizzle/journal')
    await stamp(client, init)
    appliedWhen = init.when
  }

  for (const entry of bundled.journal.entries) {
    if (appliedWhen !== null && appliedWhen >= entry.when) continue
    await applyEntry(client, entry)
    appliedWhen = entry.when
  }
}

export function listMigrationTags() {
  return bundled.journal.entries.map((entry) => entry.tag)
}
