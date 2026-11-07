import { describe, expect, it } from 'vitest'
import {
  APP_ROUTE_PATHS,
  MARKETING_ROUTE_PATHS,
  checkModeConsistency,
  expectedModeForHost,
  isAppOnlyPath,
  isMarketingPath,
  pathMatchesRoute,
  redirectForCurrentRoute,
} from '#/lib/site-mode'

const APP = 'https://app.pocketbook.localhost'
const MKT = 'https://pocketbook.localhost'

describe('pathMatchesRoute', () => {
  it('matches exact paths', () => {
    expect(pathMatchesRoute('/ledger', '/ledger')).toBe(true)
    expect(pathMatchesRoute('/features', '/features')).toBe(true)
  })

  it('matches path-segment prefixes, not string prefixes', () => {
    expect(pathMatchesRoute('/ledger/foo', '/ledger')).toBe(true)
    expect(pathMatchesRoute('/ledgerx', '/ledger')).toBe(false)
    expect(pathMatchesRoute('/features-extra', '/features')).toBe(false)
  })
})

describe('route classification', () => {
  it('marks features and privacy as marketing', () => {
    expect(MARKETING_ROUTE_PATHS).toEqual(['/features', '/privacy'])
    expect(isMarketingPath('/features')).toBe(true)
    expect(isMarketingPath('/privacy')).toBe(true)
    expect(isMarketingPath('/ledger')).toBe(false)
  })

  it('marks ledger/recurring/savings/categories/year as app-only', () => {
    expect([...APP_ROUTE_PATHS]).toEqual([
      '/ledger',
      '/recurring',
      '/savings',
      '/categories',
      '/year',
    ])
    for (const path of APP_ROUTE_PATHS) {
      expect(isAppOnlyPath(path)).toBe(true)
      expect(isMarketingPath(path)).toBe(false)
    }
  })

  it('does not treat index as app-only or marketing', () => {
    expect(isAppOnlyPath('/')).toBe(false)
    expect(isMarketingPath('/')).toBe(false)
  })
})

describe('expectedModeForHost', () => {
  it('returns app for the app host', () => {
    expect(expectedModeForHost('app.pocketbook.localhost', APP, MKT)).toBe(
      'app',
    )
  })

  it('returns marketing for the marketing host', () => {
    expect(expectedModeForHost('pocketbook.localhost', APP, MKT)).toBe(
      'marketing',
    )
  })

  it('returns null for unknown hosts', () => {
    expect(expectedModeForHost('localhost', APP, MKT)).toBeNull()
    expect(expectedModeForHost('preview-xyz.vercel.app', APP, MKT)).toBeNull()
  })
})

describe('checkModeConsistency', () => {
  it('passes when host and mode agree', () => {
    expect(
      checkModeConsistency('app.pocketbook.localhost', 'app', APP, MKT),
    ).toEqual({ ok: true, expected: 'app' })
    expect(
      checkModeConsistency('pocketbook.localhost', 'marketing', APP, MKT),
    ).toEqual({ ok: true, expected: 'marketing' })
  })

  it('fails when app host serves a marketing build', () => {
    const result = checkModeConsistency(
      'app.pocketbook.localhost',
      'marketing',
      APP,
      MKT,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.expected).toBe('app')
      expect(result.actual).toBe('marketing')
      expect(result.message).toMatch(/wrong host/i)
    }
  })

  it('fails when marketing host serves an app build', () => {
    const result = checkModeConsistency('pocketbook.localhost', 'app', APP, MKT)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.expected).toBe('marketing')
      expect(result.actual).toBe('app')
    }
  })

  it('passes (no hard fail) for unknown hosts', () => {
    expect(checkModeConsistency('localhost', 'app', APP, MKT)).toEqual({
      ok: true,
      expected: null,
    })
  })
})

describe('redirectForCurrentRoute', () => {
  it('redirects app-only paths from marketing host to app URL', () => {
    expect(
      redirectForCurrentRoute('/ledger', {
        mode: 'marketing',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'pocketbook.localhost',
      }),
    ).toBe(`${APP}/ledger`)
    expect(
      redirectForCurrentRoute('/year', {
        mode: 'marketing',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'pocketbook.localhost',
      }),
    ).toBe(`${APP}/year`)
  })

  it('redirects marketing paths from app host to marketing URL', () => {
    expect(
      redirectForCurrentRoute('/features', {
        mode: 'app',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'app.pocketbook.localhost',
      }),
    ).toBe(`${MKT}/features`)
    expect(
      redirectForCurrentRoute('/privacy', {
        mode: 'app',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'app.pocketbook.localhost',
      }),
    ).toBe(`${MKT}/privacy`)
  })

  it('returns null when the current mode already owns the path', () => {
    expect(
      redirectForCurrentRoute('/features', {
        mode: 'marketing',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'pocketbook.localhost',
      }),
    ).toBeNull()
    expect(
      redirectForCurrentRoute('/ledger', {
        mode: 'app',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'app.pocketbook.localhost',
      }),
    ).toBeNull()
    expect(
      redirectForCurrentRoute('/', {
        mode: 'app',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'app.pocketbook.localhost',
      }),
    ).toBeNull()
  })

  it('does not redirect lookalike paths', () => {
    expect(
      redirectForCurrentRoute('/ledgerx', {
        mode: 'marketing',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'pocketbook.localhost',
      }),
    ).toBeNull()
  })

  it('skips redirects on plain localhost (single-origin pnpm dev)', () => {
    expect(
      redirectForCurrentRoute('/features', {
        mode: 'app',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: 'localhost',
      }),
    ).toBeNull()
    expect(
      redirectForCurrentRoute('/ledger', {
        mode: 'marketing',
        appUrl: APP,
        marketingUrl: MKT,
        hostname: '127.0.0.1',
      }),
    ).toBeNull()
  })
})
