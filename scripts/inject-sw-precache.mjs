/**
 * After `vite build`, rewrite `.output/public/sw.js` so install precaches every
 * hashed asset (route chunks, workers, wasm, fonts). Without this, airplane
 * mode fails on first visit to a lazy route: "Failed to fetch dynamically
 * imported module".
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

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outDir = path.join(root, '.output', 'public')
const swPath = path.join(outDir, 'sw.js')

const ASSET_EXT = new Set([
  '.js',
  '.css',
  '.wasm',
  '.woff',
  '.woff2',
  '.png',
  '.svg',
  '.ico',
  '.webp',
  '.webmanifest',
  '.html',
])

function walk(dir, base = dir) {
  const urls = []
  if (!existsSync(dir)) return urls
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      urls.push(...walk(full, base))
      continue
    }
    const ext = path.extname(name).toLowerCase()
    if (!ASSET_EXT.has(ext)) continue
    if (name === 'sw.js') continue
    const rel = path.relative(base, full).split(path.sep).join('/')
    urls.push(`/${rel}`)
  }
  return urls
}

function replaceMarkedBlock(source, startMark, endMark, replacement) {
  const start = source.indexOf(startMark)
  const end = source.indexOf(endMark)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`missing markers ${startMark} … ${endMark}`)
  }
  return (
    source.slice(0, start) +
    startMark +
    '\n' +
    replacement +
    '\n' +
    source.slice(end)
  )
}

function main() {
  if (!existsSync(outDir)) {
    console.error(`[inject-sw-precache] missing ${outDir}; run vite build first`)
    process.exit(1)
  }
  if (!existsSync(swPath)) {
    console.error(`[inject-sw-precache] missing ${swPath}`)
    process.exit(1)
  }

  const shell = ['/', '/manifest.webmanifest', '/_shell.html']
  const found = walk(outDir)
  const urls = [...new Set([...shell, ...found])].sort()

  const version = createHash('sha256')
    .update(urls.join('\n'))
    .digest('hex')
    .slice(0, 12)

  let source = readFileSync(swPath, 'utf8')
  try {
    source = replaceMarkedBlock(
      source,
      '// SW_VERSION_START',
      '// SW_VERSION_END',
      `const SW_VERSION = '${version}'`,
    )
    source = replaceMarkedBlock(
      source,
      '// PRECACHE_START',
      '// PRECACHE_END',
      `const PRECACHE = ${JSON.stringify(urls, null, 2)}`,
    )
  } catch (err) {
    console.error(`[inject-sw-precache] ${err.message}`)
    process.exit(1)
  }

  writeFileSync(swPath, source)
  console.log(
    `[inject-sw-precache] wrote ${urls.length} urls into sw.js (v=${version})`,
  )
}

main()
