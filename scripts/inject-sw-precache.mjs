/**
 * After `vite build` (+ Nitro), rewrite sw.js in every Nitro public dir so
 * install precaches hashed assets. Resolves both:
 *   - `.output/public` (local node-server preset)
 *   - `.vercel/output/static` (Vercel Build Output API preset)
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

function main() {
  const dirs = resolvePublicDirs(root, existsSync)
  if (dirs.length === 0) {
    const tried = [
      path.join(root, '.vercel/output/static'),
      path.join(root, '.output/public'),
    ]
    console.error(
      `[inject-sw-precache] no sw.js under Nitro public dirs:\n  - ${tried.join('\n  - ')}\nrun vite build first`,
    )
    process.exit(1)
  }

  let total = 0
  for (const outDir of dirs) {
    const found = walkAssetUrls(outDir, fsApi).filter((url) =>
      isCacheableAssetPath(new URL(url, 'https://app.local').pathname),
    )
    // Always keep shell entries even if not on disk yet (_shell.html may lag).
    const urls = buildPrecacheList(found)
    const version = createHash('sha256')
      .update(urls.join('\n'))
      .digest('hex')
      .slice(0, 12)

    const swPath = path.join(outDir, 'sw.js')
    const source = readFileSync(swPath, 'utf8')
    let patched
    try {
      patched = patchSwSource(source, version, urls)
    } catch (err) {
      console.error(`[inject-sw-precache] ${outDir}: ${err.message}`)
      process.exit(1)
    }
    writeFileSync(swPath, patched)
    total = Math.max(total, urls.length)
    console.log(
      `[inject-sw-precache] ${path.relative(root, outDir)}: ${urls.length} urls (v=${version})`,
    )
  }

  if (total < 5) {
    console.error(
      `[inject-sw-precache] refused: precache list too small (${total}); expected hashed /assets/*`,
    )
    process.exit(1)
  }
}

main()
