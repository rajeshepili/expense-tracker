export type StorageBreakdown = {
  /** Bytes reported by `navigator.storage.estimate().usage` (origin total). */
  usage: number | null
  quota: number | null
  /** Sum of OPFS file sizes we can enumerate (may under-count locked files). */
  opfsBytes: number | null
  /** OPFS entries under the origin root (name → size). */
  opfsFiles: Array<{ name: string; size: number }>
}

function isNotFound(err: unknown) {
  return err instanceof DOMException && err.name === 'NotFoundError'
}

/** Sum sizes of files in an OPFS directory (non-recursive beyond one level of dirs). */
async function walkOpfs(
  dir: FileSystemDirectoryHandle,
  prefix = '',
): Promise<Array<{ name: string; size: number }>> {
  const out: Array<{ name: string; size: number }> = []
  for await (const [name, handle] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'file') {
      try {
        const file = await handle.getFile()
        out.push({ name: path, size: file.size })
      } catch {
        // Locked SyncAccessHandle / busy file — skip size.
      }
    } else if (handle.kind === 'directory') {
      out.push(...(await walkOpfs(handle, path)))
    }
  }
  return out
}

/**
 * Origin storage snapshot for diagnostics (Settings / Backup).
 * Safe to call when OPFS is missing — returns nulls.
 */
export async function measureStorageUsage(): Promise<StorageBreakdown> {
  let usage: number | null = null
  let quota: number | null = null
  try {
    const estimate = await navigator.storage?.estimate?.()
    usage = estimate?.usage ?? null
    quota = estimate?.quota ?? null
  } catch {
    // private mode / unsupported
  }

  let opfsFiles: Array<{ name: string; size: number }> = []
  let opfsBytes: number | null = null
  try {
    if (navigator.storage?.getDirectory) {
      const root = await navigator.storage.getDirectory()
      opfsFiles = await walkOpfs(root)
      opfsBytes = opfsFiles.reduce((sum, f) => sum + f.size, 0)
    }
  } catch {
    opfsBytes = null
  }

  return { usage, quota, opfsBytes, opfsFiles }
}

/** Human label for bytes (1024 base). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let n = bytes
  let i = -1
  do {
    n /= 1024
    i += 1
  } while (n >= 1024 && i < units.length - 1)
  const rounded = n >= 10 || Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)
  return `${rounded} ${units[i]}`
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
