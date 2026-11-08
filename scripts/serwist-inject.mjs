#!/usr/bin/env node
/**
 * Post-build Serwist injectManifest.
 *
 * TanStack Start + Nitro finish writing public assets (and `_shell.html`) only
 * after `vite build` exits — Vite/Nitro hooks race that. Run this once after
 * the build, against whichever public dir the preset left behind.
 *
 * Usage (wired from package.json):
 *   VITE_SITE_MODE=app vite build && node scripts/serwist-inject.mjs
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectManifest } from '@serwist/build'
import { build } from 'vite'
import {
  SERWIST_GLOB_PATTERNS,
  SERWIST_SHELL_URLS,
} from './serwist-precache-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

if (process.env.VITE_SITE_MODE === 'marketing') {
  console.log('[serwist] skip: marketing build')
  process.exit(0)
}

function countAssetFiles(publicDir) {
  const assets = path.join(publicDir, 'assets')
  if (!existsSync(assets)) return 0
  try {
    return readdirSync(assets).length
  } catch {
    return 0
  }
}

function resolvePublicDirs() {
  const candidates = [
    path.join(root, '.vercel/output/static'),
    path.join(root, '.output/public'),
  ]
  return candidates.filter((dir) => countAssetFiles(dir) >= 3)
}

function revisionFor(publicDir) {
  const shellPath = path.join(publicDir, '_shell.html')
  if (existsSync(shellPath)) {
    return createHash('sha256')
      .update(readFileSync(shellPath))
      .digest('hex')
      .slice(0, 12)
  }
  // Declare shell URLs even if missing — SW install fetches them online once.
  return createHash('sha256')
    .update(`pocketbook-${Date.now()}`)
    .digest('hex')
    .slice(0, 12)
}

async function injectInto(publicDir) {
  const swSrc = path.join(root, 'src/sw.ts')
  const swDest = path.join(publicDir, 'sw.js')
  const tmpDir = path.join(root, 'node_modules/.cache/pocketbook-serwist')
  const tmpSw = path.join(tmpDir, 'sw.js')

  if (!existsSync(swSrc)) {
    throw new Error(`[serwist] missing ${swSrc}`)
  }

  mkdirSync(tmpDir, { recursive: true })
  rmSync(tmpSw, { force: true })

  // Bundle into a temp dir — never into publicDir (emptyOutDir would wipe assets).
  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    publicDir: false,
    build: {
      emptyOutDir: true,
      outDir: tmpDir,
      minify: true,
      lib: {
        entry: swSrc,
        name: 'sw',
        formats: ['iife'],
        fileName: () => 'sw.js',
      },
      rollupOptions: {
        output: { entryFileNames: 'sw.js' },
      },
    },
  })

  if (!existsSync(tmpSw)) {
    throw new Error(`[serwist] vite did not emit ${tmpSw}`)
  }

  const revision = revisionFor(publicDir)
  const { count, size, warnings } = await injectManifest({
    swSrc: tmpSw,
    swDest,
    globDirectory: publicDir,
    globPatterns: [...SERWIST_GLOB_PATTERNS],
    globIgnores: ['**/sw.js'],
    injectionPoint: 'self.__SW_MANIFEST',
    dontCacheBustURLsMatching: /^assets\//,
    // Always declare shell URLs — do not race TanStack for `_shell.html` on disk.
    additionalPrecacheEntries: SERWIST_SHELL_URLS.map((url) => ({
      url,
      revision,
    })),
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  })

  for (const warning of warnings) {
    console.warn(`[serwist] ${warning}`)
  }
  if (count < 5) {
    throw new Error(
      `[serwist] refused: precache too small (${count} entries) in ${publicDir}`,
    )
  }

  const rel = path.relative(root, publicDir)
  console.log(
    `[serwist] ${rel || '.'}: precached ${count} files (${(size / 1024).toFixed(0)} KiB)`,
  )
}

const publicDirs = resolvePublicDirs()
if (publicDirs.length === 0) {
  console.error(
    '[serwist] no Nitro public dir with client assets (.output/public or .vercel/output/static)',
  )
  process.exit(1)
}

for (const dir of publicDirs) {
  await injectInto(dir)
}
