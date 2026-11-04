import { expect, test } from '@playwright/test'
import { completeOnboarding, goToNav, tableCell } from './helpers'

test.describe('sample data smoke @smoke', () => {
  test('sample onboard seeds ledger and recurring', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample', budget: '2500' })

    // Overview shows month activity (sample ledger has income + expenses).
    await expect(page.getByText('Income').first()).toBeVisible()
    await expect(page.getByText('Expenses').first()).toBeVisible()

    await goToNav(page, 'Ledger')
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible()
    // Seeded descriptions from sample-ledger.ts (relative to today → current month).
    await expect(tableCell(page, 'Grocery run')).toBeVisible()
    await expect(tableCell(page, 'Top up spending card')).toHaveCount(2)

    await goToNav(page, 'Recurring')
    await expect(page.getByRole('heading', { name: 'Recurring' })).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })
})
