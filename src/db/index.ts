import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import type { SQLocalDrizzle } from 'sqlocal/drizzle'
import { migrateSchema } from './migrate'
import * as schema from './schema'

type AppDb = SqliteRemoteDatabase<typeof schema>

const DATABASE_PATH = 'expense-tracker.sqlite3'

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

  const next = new SQLocalDrizzle({ databasePath: DATABASE_PATH })
  await next.sql`SELECT 1`
  await migrateSchema(next)

  client = next
  db = drizzle(next.driver, next.batchDriver, { schema })
  return db
}

/** Start WASM/worker immediately (safe to call multiple times) */
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

/** Replace the on-device DB. Caller should reload afterward */
export async function importDatabaseFile(file: File) {
  await (await requireClient()).overwriteDatabaseFile(file)
  reset()
}

if (typeof window !== 'undefined') {
  warmDatabase()
}
