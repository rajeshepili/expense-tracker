import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  BACKUP_REMINDER_AFTER_MS,
  dismissBackupReminder,
  formatLastExportLabel,
  getLastExportAt,
  markBackupExported,
  shouldShowBackupReminder,
} from '#/lib/backup'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  })
}

beforeEach(() => {
  installMemoryLocalStorage()
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('backup prefs', () => {
  it('tracks last export and formats labels', () => {
    expect(getLastExportAt()).toBeNull()
    expect(formatLastExportLabel(null)).toMatch(/No backup/i)

    const now = Date.UTC(2026, 9, 25)
    markBackupExported(now)
    expect(getLastExportAt()).toBe(now)
    expect(formatLastExportLabel(now, now)).toMatch(/today/i)
    expect(
      formatLastExportLabel(now - 24 * 60 * 60 * 1000, now),
    ).toMatch(/yesterday/i)
  })

  it('shows reminder until export is recent or snoozed', () => {
    const now = Date.UTC(2026, 9, 25)
    expect(shouldShowBackupReminder(now)).toBe(true)

    markBackupExported(now - BACKUP_REMINDER_AFTER_MS - 1)
    expect(shouldShowBackupReminder(now)).toBe(true)

    markBackupExported(now)
    expect(shouldShowBackupReminder(now)).toBe(false)

    markBackupExported(now - BACKUP_REMINDER_AFTER_MS - 1)
    dismissBackupReminder(now + 60_000)
    expect(shouldShowBackupReminder(now)).toBe(false)
    expect(shouldShowBackupReminder(now + 120_000)).toBe(true)
  })
})
