import {
  exportDatabaseFile,
  importDatabaseFile,
  ensureDatabase,
} from '#/db/index'
import { downloadBlob, markBackupExported } from '#/lib/backup'

export async function downloadBackup() {
  await ensureDatabase()
  const file = await exportDatabaseFile()
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `expense-tracker-backup-${stamp}.sqlite3`
  downloadBlob(file, filename)
  markBackupExported()
  return { filename }
}

const SQLITE_MAGIC = 'SQLite format 3\0'

/** Validate SQLite file header before restore. */
function validateSqliteHeader(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const header = new Uint8Array(reader.result as ArrayBuffer, 0, 16)
      const text = new TextDecoder().decode(header)
      if (text === SQLITE_MAGIC) {
        resolve()
      } else {
        reject(new Error('File is not a valid SQLite database'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsArrayBuffer(file.slice(0, 16))
  })
}

/** Overwrite local DB, then reload. */
export async function restoreBackup(file: File) {
  if (!file.size) throw new Error('Choose a backup file to restore')
  await validateSqliteHeader(file)
  await ensureDatabase()
  await importDatabaseFile(file)
  markBackupExported()
  window.location.reload()
}
