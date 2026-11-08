/**
 * Manual/CLI fallback for SW precache injection.
 * Production builds use the Vite plugin (`src/vite-sw-precache.ts`) via Nitro's
 * `compiled` hook — prefer that. This script remains for re-running against an
 * existing `.output` / `.vercel/output` tree without a full rebuild.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPrecacheList,
  isCacheableAssetPath,
  patchSwSource,
  resolvePublicDirs,
  walkAssetUrls,
} from './sw-precache-core.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const fsApi = { existsSync, readdirSync, statSync }

const dirs = resolvePublicDirs(root, existsSync)
if (dirs.length === 0) {
  console.error(
    '[inject-sw-precache] no sw.js under Nitro public dirs; run vite build first',
  )
  process.exit(1)
}

for (const outDir of dirs) {
  const found = walkAssetUrls(outDir, fsApi).filter((url) =>
    isCacheableAssetPath(new URL(url, 'https://app.local').pathname),
  )
  const urls = buildPrecacheList(found)
  const version = createHash('sha256')
    .update(urls.join('\n'))
    .digest('hex')
    .slice(0, 12)
  const swPath = path.join(outDir, 'sw.js')
  writeFileSync(
    swPath,
    patchSwSource(readFileSync(swPath, 'utf8'), version, urls),
  )
  console.log(
    `[inject-sw-precache] ${path.relative(root, outDir)}: ${urls.length} urls (v=${version})`,
  )
}
