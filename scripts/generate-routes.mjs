#!/usr/bin/env node
/**
 * Generate both app and marketing route trees (TanStack Router CLI
 * only reads tsr.config.json, so we swap configs per pass).
 */
import { copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

for (const mode of ['app', 'marketing']) {
  copyFileSync(
    path.join(cwd, `tsr.${mode}.json`),
    path.join(cwd, 'tsr.config.json'),
  )
  const result = spawnSync('pnpm', ['exec', 'tsr', 'generate'], {
    cwd,
    stdio: 'inherit',
    shell: false,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  console.log(`generated routeTree.${mode}.gen.ts`)
}

// Leave tsr.config.json pointing at app (default local/dev mode).
copyFileSync(path.join(cwd, 'tsr.app.json'), path.join(cwd, 'tsr.config.json'))
