#!/usr/bin/env node
/**
 * Fail the marketing build if product/SQLite code leaked into `.output`.
 *
 * Usage (after `VITE_SITE_MODE=marketing pnpm build`):
 *   node scripts/assert-marketing-bundle.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, '.output')

/** Strip block + line comments so docstrings don't false-positive. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const FORBIDDEN = [
  {
    label: 'sqlocal package',
    re: /from["']sqlocal|require\(["']sqlocal|sqlocal\/drizzle/,
  },
  { label: 'sqlite db path', re: /expense-tracker\.sqlite3/ },
  { label: 'warmDatabase call', re: /warmDatabase\s*\(/ },
  { label: 'AppGate component', re: /\bAppGate\b/ },
  { label: 'AppNav component', re: /\bAppNav\b/ },
  { label: 'app ledger route module', re: /routes\/app\/ledger/ },
  { label: 'SQLocalDrizzle', re: /\bSQLocalDrizzle\b/ },
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (/\.(js|mjs|cjs)$/.test(name)) files.push(full)
  }
  return files
}

let files
try {
  files = walk(outDir)
} catch {
  console.error(`FAIL  .output not found — run a marketing build first`)
  process.exit(1)
}

if (files.length === 0) {
  console.error('FAIL  no JS under .output')
  process.exit(1)
}

let failures = 0
for (const file of files) {
  const text = stripComments(readFileSync(file, 'utf8'))
  for (const rule of FORBIDDEN) {
    if (rule.re.test(text)) {
      console.error(`FAIL  ${rule.label} found in ${path.relative(root, file)}`)
      failures++
    }
  }
}

const swPath = path.join(outDir, 'public', 'sw.js')
if (existsSync(swPath)) {
  console.error('FAIL  marketing output must not ship sw.js')
  failures++
}

if (failures > 0) {
  console.error(`\n${failures} marketing-bundle leak(s)`)
  process.exit(1)
}

console.log(
  `PASS  marketing bundle clean (${files.length} files, no product/SQLite markers)`,
)
