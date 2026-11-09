function isNotFound(err: unknown) {
  return err instanceof DOMException && err.name === 'NotFoundError'
}

/**
 * Remove orphaned `backup-<ts>--*` files left if VACUUM INTO export crashed
 * before cleanup. Safe to call on every DB open.
 */
export async function cleanupOrphanedOpfsBackups(
  databaseFileName = 'expense-tracker.sqlite3',
): Promise<number> {
  if (!navigator.storage?.getDirectory) return 0
  let removed = 0
  try {
    const root = await navigator.storage.getDirectory()
    const prefix = `backup-`
    const suffix = `--${databaseFileName}`
    for await (const [name, handle] of root.entries()) {
      if (handle.kind !== 'file') continue
      if (!name.startsWith(prefix) || !name.endsWith(suffix)) continue
      try {
        await root.removeEntry(name)
        removed += 1
      } catch (err) {
        if (!isNotFound(err)) throw err
      }
    }
  } catch {
    return removed
  }
  return removed
}
