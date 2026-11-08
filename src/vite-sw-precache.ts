import { createHash } from 'node:crypto'
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import {
  buildPrecacheList,
  isCacheableAssetPath,
  patchSwSource,
  walkAssetUrls,
} from '../scripts/sw-precache-core.mjs'

const fsApi = { existsSync, readdirSync, statSync }

type NitroLike = {
  options: { output: { publicDir: string }; rootDir: string }
  hooks: { hook: (name: string, fn: () => void | Promise<void>) => void }
}

function injectIntoPublicDir(nitro: NitroLike) {
  const publicDir = nitro.options.output.publicDir
  const swPath = path.join(publicDir, 'sw.js')
  if (!existsSync(swPath)) {
    throw new Error(
      `[inject-sw-precache] missing ${swPath} (Nitro publicDir has no sw.js)`,
    )
  }

  const found = walkAssetUrls(publicDir, fsApi).filter((url) =>
    isCacheableAssetPath(new URL(url, 'https://app.local').pathname),
  )
  const urls = buildPrecacheList(found)
  if (urls.length < 5) {
    throw new Error(
      `[inject-sw-precache] refused: precache list too small (${urls.length}) in ${publicDir}`,
    )
  }

  const version = createHash('sha256')
    .update(urls.join('\n'))
    .digest('hex')
    .slice(0, 12)

  writeFileSync(
    swPath,
    patchSwSource(readFileSync(swPath, 'utf8'), version, urls),
  )

  const rel = path.relative(nitro.options.rootDir, publicDir)
  console.log(
    `[inject-sw-precache] ${rel || '.'}: ${urls.length} urls (v=${version})`,
  )
}

/**
 * Patch `sw.js` in Nitro's final public dir after the server build finishes.
 *
 * A plain Vite `closeBundle` is too early: Nitro relocates client assets to
 * `.output/public` or `.vercel/output/static` depending on the preset. Register
 * as a Nitro module via `plugin.nitro.setup` so we hook `compiled` against that
 * resolved `publicDir`.
 */
export function injectSwPrecache(): Plugin {
  return {
    name: 'inject-sw-precache',
    apply: 'build',
    // Nitro scans Vite plugins for a `nitro` module with setup().
    nitro: {
      setup(nitro: NitroLike) {
        nitro.hooks.hook('compiled', () => injectIntoPublicDir(nitro))
      },
    },
  } as Plugin
}
