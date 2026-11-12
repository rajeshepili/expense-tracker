/**
 * Keep Nitro’s baked `/sw.js` public-assets meta in sync after serwist-inject
 * overwrites the pre-build stub. Without this, Content-Length stays at the
 * stub size and the SW response is truncated under `pnpm preview`.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** Match Nitro’s `etag` package entitytag() used for public-assets-data. */
export function nitroEntityEtag(buf) {
  if (buf.length === 0) return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'
  const hash = createHash('sha1')
    .update(buf)
    .digest('base64')
    .substring(0, 27)
  return `"${buf.length.toString(16)}-${hash}"`
}

export function syncNitroSwAssetMeta(projectRoot) {
  const swPath = path.join(projectRoot, '.output/public/sw.js')
  const serverIndex = path.join(projectRoot, '.output/server/index.mjs')
  if (!existsSync(swPath) || !existsSync(serverIndex)) return false

  const buf = readFileSync(swPath)
  const st = statSync(swPath)
  const entry = {
    type: 'text/javascript; charset=utf-8',
    etag: nitroEntityEtag(buf),
    mtime: st.mtime.toJSON(),
    size: st.size,
    path: '../public/sw.js',
  }

  let text = readFileSync(serverIndex, 'utf8')
  const re = /"\/sw\.js":\s*\{[^}]*\}/
  if (!re.test(text)) {
    console.warn(
      '[serwist] Nitro public_assets_data missing /sw.js — keep public/sw.js stub',
    )
    return false
  }
  const pretty = JSON.stringify(entry, null, 2).replace(/\n/g, '\n\t')
  text = text.replace(re, `"/sw.js": ${pretty}`)
  writeFileSync(serverIndex, text)
  console.log(`[serwist] synced Nitro /sw.js meta (${st.size} bytes)`)
  return true
}
