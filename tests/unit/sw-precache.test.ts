import { describe, expect, it } from 'vitest'
import {
  SERWIST_GLOB_PATTERNS,
  SERWIST_SHELL_URLS,
} from '#/sw-precache-config'

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
