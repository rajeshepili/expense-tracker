const LAST_EXPORT_KEY = 'expense-tracker-last-export-at'
const REMINDER_DISMISS_KEY = 'expense-tracker-backup-reminder-dismissed-until'
const REMINDER_HIDDEN_KEY = 'expense-tracker-backup-reminder-hidden'
const LOCAL_DATA_HIDDEN_KEY = 'expense-tracker-local-data-callout-hidden'

const DAY_MS = 24 * 60 * 60 * 1000

export const BACKUP_REMINDER_AFTER_MS = 14 * DAY_MS
export const BACKUP_REMINDER_SNOOZE_MS = 7 * DAY_MS

function readNumber(key: string): number | null {
  try {
    const raw = globalThis.localStorage.getItem(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeNumber(key: string, value: number) {
  try {
    globalThis.localStorage.setItem(key, String(value))
  } catch {
    // private mode / quota
  }
}

export function getLastExportAt(): number | null {
  return readNumber(LAST_EXPORT_KEY)
}

export function markBackupExported(at = Date.now()) {
  writeNumber(LAST_EXPORT_KEY, at)
}

export function dismissBackupReminder(
  until = Date.now() + BACKUP_REMINDER_SNOOZE_MS,
) {
  writeNumber(REMINDER_DISMISS_KEY, until)
}

export function hideBackupReminderForever() {
  try {
    globalThis.localStorage.setItem(REMINDER_HIDDEN_KEY, '1')
  } catch {
    // private mode / quota
  }
}

export function hideLocalDataCalloutForever() {
  try {
    globalThis.localStorage.setItem(LOCAL_DATA_HIDDEN_KEY, '1')
  } catch {
    // private mode / quota
  }
}

export function isLocalDataCalloutHidden(): boolean {
  try {
    return globalThis.localStorage.getItem(LOCAL_DATA_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldShowBackupReminder(now = Date.now()): boolean {
  try {
    if (globalThis.localStorage.getItem(REMINDER_HIDDEN_KEY) === '1')
      return false
  } catch {
    // private mode / quota
  }

  const dismissedUntil = readNumber(REMINDER_DISMISS_KEY)
  if (dismissedUntil !== null && now < dismissedUntil) return false

  const last = getLastExportAt()
  if (last === null) return true
  return now - last >= BACKUP_REMINDER_AFTER_MS
}

export function formatLastExportLabel(
  at: number | null,
  now = Date.now(),
): string {
  if (at === null) return 'No backup downloaded yet'
  const days = Math.floor((now - at) / DAY_MS)
  if (days <= 0) return 'Last backup: today'
  if (days === 1) return 'Last backup: yesterday'
  return `Last backup: ${days} days ago`
}

export function downloadBlob(file: Blob, filename: string) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
