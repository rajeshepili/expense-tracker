import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import type { SQLocalDrizzle } from 'sqlocal/drizzle'
import { SITE_MODE } from '#/lib/brand'
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
  await next.sql`PRAGMA foreign_keys = ON`
  await next.sql`PRAGMA journal_mode = WAL`
  await next.sql`PRAGMA synchronous = NORMAL`
  await next.sql`PRAGMA wal_autocheckpoint = 1000`
  await next.sql`PRAGMA journal_size_limit = 8388608`
  await migrateSchema(next)
  await next.sql`PRAGMA wal_checkpoint(TRUNCATE)`
  const { cleanupOrphanedOpfsBackups } = await import('#/lib/storage-usage')
  await cleanupOrphanedOpfsBackups(DATABASE_PATH)

  client = next
  db = drizzle(next.driver, next.batchDriver, { schema })
  return db
}

export async function checkpointWal() {
  try {
    const c = await requireClient()
    await c.sql`PRAGMA wal_checkpoint(TRUNCATE)`
  } catch {
    // ignore closed/unavailable DB during teardown
  }
}

let checkpointTimer: ReturnType<typeof setTimeout> | null = null

/** Debounce WAL checkpoints across a burst of writes (default 30s). */
export function scheduleCheckpointWal(delayMs = 30_000) {
  if (typeof window === 'undefined') return
  if (checkpointTimer) clearTimeout(checkpointTimer)
  checkpointTimer = setTimeout(() => {
    checkpointTimer = null
    void checkpointWal()
  }, delayMs)
}

export function clearScheduledCheckpointWal() {
  if (checkpointTimer) {
    clearTimeout(checkpointTimer)
    checkpointTimer = null
  }
}

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

export async function requireClientForMerge() {
  return requireClient()
}

export async function exportDatabaseFile() {
  return (await requireClient()).getDatabaseFile()
}

export async function importDatabaseFile(file: File) {
  await (await requireClient()).overwriteDatabaseFile(file)
  reset()
}

// Warm when SITE_MODE=app and OPFS exists.
function hasOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage.getDirectory === 'function'
  )
}

if (typeof window !== 'undefined' && SITE_MODE === 'app' && hasOpfs()) {
  warmDatabase()
}
