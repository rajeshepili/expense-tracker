import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKUP_REMINDER_AFTER_MS,
  dismissBackupReminder,
  formatLastExportLabel,
  getLastExportAt,
  hideBackupReminderForever,
  hideLocalDataCalloutForever,
  isLocalDataCalloutHidden,
  markBackupExported,
  shouldShowBackupReminder,
} from '#/lib/backup'
import { installMemoryLocalStorage } from '../test-utils'

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('backup prefs', () => {
  const now = Date.UTC(2026, 9, 25)

  it('records the last export and labels relative days', () => {
    expect(getLastExportAt()).toBeNull()
    expect(formatLastExportLabel(null)).toMatch(/No backup/i)

    markBackupExported(now)
    expect(getLastExportAt()).toBe(now)
    expect(formatLastExportLabel(now, now)).toMatch(/today/i)
    expect(formatLastExportLabel(now - 24 * 60 * 60 * 1000, now)).toMatch(
      /yesterday/i,
    )
  })

  it('shows the reminder until a recent export or an active snooze', () => {
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

  it('stays hidden forever once the user opts out of the reminder', () => {
    hideBackupReminderForever()
    expect(shouldShowBackupReminder(now)).toBe(false)
    // even with no export and no snooze, and far in the future
    expect(shouldShowBackupReminder(now + 365 * 24 * 60 * 60 * 1000)).toBe(false)
  })

  it('tracks the local-data callout opt-out', () => {
    expect(isLocalDataCalloutHidden()).toBe(false)
    hideLocalDataCalloutForever()
    expect(isLocalDataCalloutHidden()).toBe(true)
  })
})
