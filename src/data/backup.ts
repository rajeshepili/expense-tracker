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

/** Overwrite local DB, then reload. */
export async function restoreBackup(file: File) {
  if (!file.size) throw new Error('Choose a backup file to restore')
  await ensureDatabase()
  await importDatabaseFile(file)
  markBackupExported()
  window.location.reload()
}
