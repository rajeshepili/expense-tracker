import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SERWIST_GLOB_PATTERNS,
  SERWIST_SHELL_URLS,
} from '#/sw-precache-config'
import { nitroEntityEtag } from '../../scripts/nitro-sw-meta.mjs'
import {
  candidatePublicDirs,
  countAssetFiles,
  resolvePublicDirs,
  revisionForShell,
} from '../../scripts/serwist-public-dirs.mjs'

describe('serwist build config', () => {
  it('keeps a public/sw.js stub for Nitro public-assets registration', () => {
    const stub = path.join(process.cwd(), 'public/sw.js')
    expect(existsSync(stub)).toBe(true)
    const body = readFileSync(stub, 'utf8')
    expect(body).toMatch(/placeholder|serwist-inject/i)
    expect(body).not.toContain('__SW_MANIFEST')
  })

  it('matches Nitro entitytag for the stub (size hex + sha1)', () => {
    const stub = readFileSync(path.join(process.cwd(), 'public/sw.js'))
    expect(nitroEntityEtag(stub)).toMatch(/^"[0-9a-f]+-[A-Za-z0-9+/]{27}"$/)
    expect(nitroEntityEtag(Buffer.alloc(0))).toBe(
      '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"',
    )
  })

  it('precaches hashed assets, icons, and manifest', () => {
    expect(SERWIST_GLOB_PATTERNS).toEqual(
      expect.arrayContaining([
        expect.stringContaining('assets/**'),
        expect.stringContaining('icons/**'),
        'manifest.webmanifest',
      ]),
    )
    expect(SERWIST_GLOB_PATTERNS).not.toContain('_shell.html')
  })

  it('declares SPA shell URLs as additional precache entries', () => {
    expect(SERWIST_SHELL_URLS).toEqual(['/', '/_shell.html'])
  })
})

describe('serwist public dir resolution', () => {
  it('prefers Vercel static output before .output/public', () => {
    const root = '/tmp/pocketbook-fixture'
    expect(candidatePublicDirs(root)).toEqual([
      path.join(root, '.vercel/output/static'),
      path.join(root, '.output/public'),
    ])
  })

  it('returns empty when neither public dir has assets', () => {
    expect(resolvePublicDirs('/tmp/does-not-exist-serwist')).toEqual([])
    expect(countAssetFiles('/tmp/does-not-exist-serwist')).toBe(0)
  })

  it('requires _shell.html for shell revision', () => {
    expect(() => revisionForShell('/tmp/does-not-exist-serwist')).toThrow(
      /missing _shell\.html/,
    )
  })
})
