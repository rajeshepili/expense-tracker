#!/usr/bin/env node
/**
 * Fail if the app build did not emit a Serwist-injected service worker.
 *
 * Usage (after `pnpm build:app`):
 *   node scripts/assert-app-sw.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const candidates = [
  path.join(root, '.output/public/sw.js'),
  path.join(root, '.vercel/output/static/sw.js'),
]

const present = candidates.filter((p) => existsSync(p))
if (present.length === 0) {
  console.error(
    'FAIL  no sw.js under .output/public or .vercel/output/static — run build:app',
  )
  process.exit(1)
}

let failures = 0
for (const swPath of present) {
  const body = readFileSync(swPath, 'utf8')
  const rel = path.relative(root, swPath)
  const checks = [
    ['no __SW_MANIFEST placeholder', !body.includes('__SW_MANIFEST')],
    ['embeds /assets/', body.includes('/assets/') || body.includes('assets/')],
    ['embeds sqlite wasm', body.includes('.wasm')],
    ['embeds shell fallback', body.includes('_shell.html')],
  ]
  for (const [label, ok] of checks) {
    if (!ok) {
      console.error(`FAIL  ${rel}: ${label}`)
      failures++
    } else {
      console.log(`PASS  ${rel}: ${label}`)
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} app SW check(s) failed`)
  process.exit(1)
}
console.log(`\nAll app SW checks passed (${present.length} sw.js)`)
