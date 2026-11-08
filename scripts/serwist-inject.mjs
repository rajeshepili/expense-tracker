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
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectManifest } from '@serwist/build'
import * as esbuild from 'esbuild'
import {
  SERWIST_GLOB_PATTERNS,
  SERWIST_SHELL_URLS,
} from './serwist-precache-config.mjs'
import {
  countAssetFiles,
  resolvePublicDirs,
  revisionForShell,
} from './serwist-public-dirs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function injectInto(publicDir, projectRoot = root) {
  const swSrc = path.join(projectRoot, 'src/sw.ts')
  const swDest = path.join(publicDir, 'sw.js')
  const tmpDir = path.join(projectRoot, 'node_modules/.cache/pocketbook-serwist')
  const tmpSw = path.join(tmpDir, 'sw.js')

  if (!existsSync(swSrc)) {
    throw new Error(`[serwist] missing ${swSrc}`)
  }
  if (countAssetFiles(publicDir) < 3) {
    throw new Error(`[serwist] publicDir has no client assets: ${publicDir}`)
  }

  mkdirSync(tmpDir, { recursive: true })
  rmSync(tmpSw, { force: true })

  // Bundle into a temp dir — never into publicDir (would risk wiping assets).
  await esbuild.build({
    absWorkingDir: projectRoot,
    entryPoints: [swSrc],
    outfile: tmpSw,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    minify: true,
    logLevel: 'warning',
  })

  if (!existsSync(tmpSw)) {
    throw new Error(`[serwist] esbuild did not emit ${tmpSw}`)
  }

  const revision = revisionForShell(publicDir)
  const { count, size, warnings } = await injectManifest({
    swSrc: tmpSw,
    swDest,
    globDirectory: publicDir,
    globPatterns: [...SERWIST_GLOB_PATTERNS],
    globIgnores: ['**/sw.js'],
    injectionPoint: 'self.__SW_MANIFEST',
    dontCacheBustURLsMatching: /^assets\//,
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

  const rel = path.relative(projectRoot, publicDir)
  console.log(
    `[serwist] ${rel || '.'}: precached ${count} files (${(size / 1024).toFixed(0)} KiB)`,
  )
  return { count, size }
}

async function main() {
  if (process.env.VITE_SITE_MODE === 'marketing') {
    console.log('[serwist] skip: marketing build')
    return
  }

  const publicDirs = resolvePublicDirs(root)
  if (publicDirs.length === 0) {
    console.error(
      '[serwist] no Nitro public dir with client assets (.output/public or .vercel/output/static)',
    )
    process.exit(1)
  }

  for (const dir of publicDirs) {
    await injectInto(dir)
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
