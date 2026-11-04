import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { completeOnboarding, goToNav } from './helpers'

async function dismissTourIfOpen(page: Page) {
  // Tour can mount a beat after Overview — retry briefly.
  for (let i = 0; i < 5; i++) {
    const close = page.getByRole('button', { name: /Skip|Close tour|Got it/i })
    if (await close.isVisible().catch(() => false)) {
      await close.click()
      await expect(close)
        .toBeHidden({ timeout: 5_000 })
        .catch(() => undefined)
      break
    }
    await page.waitForTimeout(200)
  }
  const later = page.getByRole('button', { name: 'Later' })
  if (await later.isVisible().catch(() => false)) {
    await later.click()
  }
}

test.describe('motion system smoke @smoke', () => {
  test('month change does not enter page/settle phases', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample' })
    await goToNav(page, 'Overview')
    await dismissTourIfOpen(page)
    await expect(page.locator('.month-view')).toBeVisible()

    const nextMonth = page.getByRole('button', { name: 'Next month' })
    await expect(nextMonth).toBeVisible()

    await page.evaluate(() => {
      const root = document.documentElement
      ;(window as unknown as { __motionPhases: string[] }).__motionPhases = []
      const obs = new MutationObserver(() => {
        const p = root.dataset.motion ?? 'idle'
        ;(
          window as unknown as { __motionPhases: string[] }
        ).__motionPhases.push(p)
      })
      obs.observe(root, { attributes: true, attributeFilter: ['data-motion'] })
      ;(window as unknown as { __motionObs: MutationObserver }).__motionObs =
        obs
    })

    await nextMonth.click()
    await page.waitForTimeout(600)

    const seen = await page.evaluate(() => {
      const w = window as unknown as {
        __motionPhases?: string[]
        __motionObs?: MutationObserver
      }
      w.__motionObs?.disconnect()
      return w.__motionPhases ?? []
    })

    expect(seen).not.toContain('page')
    expect(seen).not.toContain('settle')
  })

  test('theme toggle returns to idle without trapping page-content', async ({
    page,
  }) => {
    await completeOnboarding(page, { mode: 'empty' })
    await goToNav(page, 'Overview')
    await dismissTourIfOpen(page)

    const themeToggle = page.getByRole('button', { name: /Theme:/i })
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()

    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.motion ?? 'idle',
          ),
        { timeout: 3000 },
      )
      .toMatch(/^(idle|overlay)$/)

    const pageContentAnim = await page.evaluate(() => {
      const el = document.querySelector('.page-content')
      if (!el) return ''
      return getComputedStyle(el).viewTransitionName
    })
    // Idle name is none; during/after nav may briefly be page-forward|page-back.
    expect(['none', '', 'page-forward', 'page-back']).toContain(pageContentAnim)
  })

  test('nav pill present; compact sheet exposes Vaul grabber without CSS transform fight', async ({
    page,
  }) => {
    // Phone + tablet use drawers (useIsCompact ≤1023). Start compact so onboarding
    // and ledger composer mount the Vaul path, not the desktop dialog.
    await page.setViewportSize({ width: 390, height: 844 })
    await completeOnboarding(page, { mode: 'empty' })
    await goToNav(page, 'Overview')
    await dismissTourIfOpen(page)

    // Desktop header also mounts a pill (hidden + opacity-0 when not md); assert the visible nav.
    const pill = page.locator('nav[aria-label="Primary"]:visible .nav-pill')
    await expect(pill).toBeVisible()

    await goToNav(page, 'Ledger')
    // Mobile label is "Add"; desktop accessible name is "Add transaction N".
    await page.getByRole('button', { name: /^Add( transaction N)?$/ }).click()

    const handle = page.locator('[data-slot="drawer-handle"]')
    await expect(handle).toBeVisible({ timeout: 10_000 })

    // Vaul owns translate — CSS transition on drawer content must be opacity-only.
    const transitionProperty = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="drawer-content"]')
      if (!el) return 'missing'
      return getComputedStyle(el).transitionProperty
    })
    expect(transitionProperty).not.toMatch(/transform/)
  })

  test('reduced motion skips route view-transition types', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await completeOnboarding(page, { mode: 'empty' })
    await goToNav(page, 'Overview')
    await dismissTourIfOpen(page)

    const vtDisabled = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    expect(vtDisabled).toBe(true)

    await goToNav(page, 'Ledger')
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible()
    // Router returns false for VT under PRM — phase should not stick on page.
    await expect
      .poll(
        async () =>
          page.evaluate(
            () => document.documentElement.dataset.motion ?? 'idle',
          ),
        { timeout: 3000 },
      )
      .toMatch(/^(idle|settle|overlay)$/)
  })
})
