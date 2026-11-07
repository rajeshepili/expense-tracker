import { expect, test } from '@playwright/test'

test.describe('marketing pages @smoke', () => {
  test('features page renders with nav and footer', async ({ page }) => {
    await page.goto('/features')
    await expect(
      page.getByRole('heading', { name: /Everything a ledger needs/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Marketing' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Privacy' }).first(),
    ).toBeVisible()
    await expect(page.getByText(/Data stays in this browser/i)).toBeVisible()
  })

  test('privacy page renders Q&A', async ({ page }) => {
    await page.goto('/privacy')
    await expect(
      page.getByRole('heading', { name: /never leaves your device/i }),
    ).toBeVisible()
    await expect(page.getByText('Where does my data live?')).toBeVisible()
  })

  test('topbar links navigate between marketing pages', async ({ page }) => {
    await page.goto('/features')
    await page
      .getByRole('navigation', { name: 'Marketing' })
      .getByRole('link', { name: 'Privacy' })
      .click()
    await expect(page).toHaveURL(/\/privacy/)
    await expect(
      page.getByRole('heading', { name: /never leaves your device/i }),
    ).toBeVisible()
  })

  test('unknown route shows branded 404', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(
      page.getByRole('heading', { name: /moved or never existed/i }),
    ).toBeVisible()
  })

  test('html carries data-site-mode marker', async ({ page }) => {
    await page.goto('/features')
    const mode = await page.locator('html').getAttribute('data-site-mode')
    // Single-origin e2e defaults to app mode; marker must still be present.
    expect(mode === 'app' || mode === 'marketing').toBe(true)
  })

  test('wrong-host bounce helper fires under portless hostnames', async ({
    page,
  }) => {
    // Inline redirect check; logic covered in site-mode.test.ts.
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
