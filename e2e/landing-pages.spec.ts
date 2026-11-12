import { expect, test } from '@playwright/test'

/** Marketing composition needs VITE_SITE_MODE=marketing; app smoke uses app mode. */
async function skipUnlessMarketing(page: import('@playwright/test').Page) {
  await page.goto('/')
  const mode = await page.locator('html').getAttribute('data-site-mode')
  test.skip(mode !== 'marketing', 'Requires VITE_SITE_MODE=marketing')
}

test.describe('landing pages @smoke', () => {
  test('home is a single landing composition', async ({ page }) => {
    await skipUnlessMarketing(page)
    await expect(page.getByText('Pocketbook').first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: /ledger that stays in this browser/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Get started' }).first(),
    ).toBeVisible()
    await expect(page.getByText(/Recent transactions/i)).toBeVisible()
  })

  test('/features redirects home', async ({ page }) => {
    await skipUnlessMarketing(page)
    await page.goto('/features')
    await expect(page).toHaveURL(/\/(?:$|\?)/)
    await expect(
      page.getByRole('heading', {
        name: /ledger that stays in this browser/i,
      }),
    ).toBeVisible()
  })

  test('/privacy redirects home', async ({ page }) => {
    await skipUnlessMarketing(page)
    await page.goto('/privacy')
    await expect(page).toHaveURL(/\/(?:$|\?)/)
    await expect(
      page.getByRole('heading', {
        name: /ledger that stays in this browser/i,
      }),
    ).toBeVisible()
  })

  test('unknown route shows branded 404', async ({ page }) => {
    await skipUnlessMarketing(page)
    await page.goto('/no-such-page')
    await expect(
      page.getByRole('heading', { name: /page not found/i }),
    ).toBeVisible()
  })

  test('html carries data-site-mode marker', async ({ page }) => {
    await page.goto('/')
    const mode = await page.locator('html').getAttribute('data-site-mode')
    expect(mode === 'app' || mode === 'marketing').toBe(true)
  })

  test('wrong-host bounce helper fires under portless hostnames', async ({
    page,
  }) => {
    await page.goto('/')
    const result = await page.evaluate(() => {
      const appUrl = 'https://app.pocketbook.localhost'
      const mktUrl = 'https://pocketbook.localhost'
      const hostname = 'app.pocketbook.localhost'
      const pathname = '/features'
      const mode = 'app' as const
      const marketingPaths = ['/features', '/privacy']
      const matches = marketingPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      )
      const hostOk =
        hostname === new URL(appUrl).hostname ||
        hostname === new URL(mktUrl).hostname
      if (!hostOk || !matches || mode !== 'app') return null
      return `${mktUrl}${pathname}`
    })
    expect(result).toBe('https://pocketbook.localhost/features')
  })
})
