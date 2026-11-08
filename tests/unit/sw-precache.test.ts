import { describe, expect, it } from 'vitest'
import {
  buildPrecacheList,
  isCacheableAssetPath,
  patchSwSource,
  resolvePublicDirs,
} from '../../scripts/sw-precache-core.mjs'

describe('sw precache core', () => {
  it('resolves Vercel static dir before local .output/public', () => {
    const existing = new Set([
      '/app/.vercel/output/static/sw.js',
      '/app/.output/public/sw.js',
    ])
    const dirs = resolvePublicDirs('/app', (p: string) => existing.has(p))
    expect(dirs).toEqual([
      '/app/.vercel/output/static',
      '/app/.output/public',
    ])
  })

  it('resolves only the Vercel dir when that is what Nitro wrote', () => {
    const existing = new Set(['/app/.vercel/output/static/sw.js'])
    expect(resolvePublicDirs('/app', (p: string) => existing.has(p))).toEqual([
      '/app/.vercel/output/static',
    ])
  })

  it('builds a sorted precache list with shell entries', () => {
    expect(
      buildPrecacheList([
        '/assets/savings-abc.js',
        '/assets/sqlite3-xyz.wasm',
        '/',
      ]),
    ).toEqual([
      '/',
      '/_shell.html',
      '/assets/savings-abc.js',
      '/assets/sqlite3-xyz.wasm',
      '/manifest.webmanifest',
    ])
  })

  it('only marks immutable static paths as cacheable', () => {
    expect(isCacheableAssetPath('/assets/foo.js')).toBe(true)
    expect(isCacheableAssetPath('/icons/icon-192.png')).toBe(true)
    expect(isCacheableAssetPath('/manifest.webmanifest')).toBe(true)
    expect(isCacheableAssetPath('/_shell.html')).toBe(true)
    expect(isCacheableAssetPath('/')).toBe(false)
    expect(isCacheableAssetPath('/api/anything')).toBe(false)
    expect(isCacheableAssetPath('/savings')).toBe(false)
  })

  it('patches version and precache markers in sw source', () => {
    const source = `// SW_VERSION_START
const SW_VERSION = 'dev'
// SW_VERSION_END
// PRECACHE_START
const PRECACHE = []
// PRECACHE_END
`
    const patched = patchSwSource(source, 'abc123', ['/', '/assets/a.js'])
    expect(patched).toContain("const SW_VERSION = 'abc123'")
    expect(patched).toContain('"/assets/a.js"')
    expect(patched).not.toContain("const SW_VERSION = 'dev'")
  })
})
