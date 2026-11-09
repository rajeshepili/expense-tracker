import { describe, expect, it, vi } from 'vitest'
import { cleanupOrphanedOpfsBackups } from '#/lib/storage-usage'

describe('cleanupOrphanedOpfsBackups', () => {
  it('no-ops when OPFS is unavailable', async () => {
    const original = navigator.storage
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined,
    })
    try {
      expect(await cleanupOrphanedOpfsBackups()).toBe(0)
    } finally {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: original,
      })
    }
  })

  it('removes matching backup orphans', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined)
    const entries = (async function* () {
      yield ['backup-1--expense-tracker.sqlite3', { kind: 'file' }] as const
      yield ['expense-tracker.sqlite3', { kind: 'file' }] as const
      yield ['backup-2--other.db', { kind: 'file' }] as const
      yield ['notes', { kind: 'directory' }] as const
    })()
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn().mockResolvedValue({
          entries: () => entries,
          removeEntry,
        }),
      },
    })

    expect(await cleanupOrphanedOpfsBackups()).toBe(1)
    expect(removeEntry).toHaveBeenCalledWith(
      'backup-1--expense-tracker.sqlite3',
    )
  })
})
