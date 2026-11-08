import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SERWIST_GLOB_PATTERNS,
  SERWIST_SHELL_URLS,
} from '#/sw-precache-config'
import {
  candidatePublicDirs,
  countAssetFiles,
  resolvePublicDirs,
  revisionForShell,
} from '../../scripts/serwist-public-dirs.mjs'

describe('serwist build config', () => {
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
