import { expect, test } from '@playwright/test'
import { completeOnboarding, goToNav } from './helpers'

test.describe('local smart features @smoke', () => {
  test('overview shows month-end projection with sample data', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample' })
    await goToNav(page, 'Overview')
    await expect(page.getByText(/at month end/i)).toBeVisible()
  })

  test('year view renders 12-month chart', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample' })
    await page.goto('/year')
    await expect(page.getByRole('heading', { name: /Year \d{4}/ })).toBeVisible()
    await expect(page.getByRole('img', { name: /Monthly income and expenses/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Top categories' })).toBeVisible()
  })

  test('bills composer supports income kind', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample' })
    await goToNav(page, 'Bills')
    await page.getByRole('button', { name: /Add recurring/i }).first().click()
    await expect(page.getByRole('combobox', { name: 'Type' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Type' }).click()
    await page.getByRole('option', { name: 'Income' }).click()
    await expect(page.getByRole('combobox', { name: 'Category' })).toBeVisible()
  })

  test('backup modal has CSV export and reminders toggle', async ({ page }) => {
    await completeOnboarding(page, { mode: 'sample' })
    await goToNav(page, 'Overview')
    await page.getByRole('button', { name: 'Backup', exact: true }).click()
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible()
    await expect(page.getByRole('switch', { name: /Bill reminders/i })).toBeVisible()
  })
})
