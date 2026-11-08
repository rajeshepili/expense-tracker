/**
 * Shared public-dir helpers for Serwist inject + unit tests.
 * Kept free of esbuild so Vitest can import it safely.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** Public dirs Nitro may emit (Vercel preset first). */
export function candidatePublicDirs(projectRoot) {
  return [
    path.join(projectRoot, '.vercel/output/static'),
    path.join(projectRoot, '.output/public'),
  ]
}

export function countAssetFiles(publicDir) {
  const assets = path.join(publicDir, 'assets')
  if (!existsSync(assets)) return 0
  try {
    return readdirSync(assets).length
  } catch {
    return 0
  }
}

export function resolvePublicDirs(projectRoot) {
  return candidatePublicDirs(projectRoot).filter(
    (dir) => countAssetFiles(dir) >= 3,
  )
}

/** Content hash of SPA shell; throws if `_shell.html` is missing after app build. */
export function revisionForShell(publicDir) {
  const shellPath = path.join(publicDir, '_shell.html')
  if (!existsSync(shellPath)) {
    throw new Error(
      `[serwist] missing _shell.html in ${publicDir} (app SPA shell required)`,
    )
  }
  return createHash('sha256')
    .update(readFileSync(shellPath))
    .digest('hex')
    .slice(0, 12)
}
