import { expect, test } from '@playwright/test'
import {
  addLedgerExpense,
  completeOnboarding,
  dialogSave,
  goToNav,
  selectOption,
} from './helpers'

test.describe('local smart features @smoke', () => {
  test('overview shows month-end projection with a bill', async ({ page }) => {
    await completeOnboarding(page)
    await goToNav(page, 'Bills')
    await page
      .getByRole('button', { name: 'Add recurring N', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: /Add recurring/i }),
    ).toBeVisible()
    await page.getByLabel(/^Name$/i).fill('Rent')
    await page.getByLabel(/^Amount$/i).fill('100')
    const categoryTrigger = page.locator('#recurring-category')
    if (
      (await categoryTrigger.count()) > 0 &&
      (await categoryTrigger.innerText()).match(/Choose category/i)
    ) {
      await selectOption(page, 'recurring-category', 'Housing')
    }
    await dialogSave(page)
    await goToNav(page, 'Overview')
    await expect(page.getByText(/at month end/i)).toBeVisible()
  })

  test('year view renders after adding a transaction', async ({ page }) => {
    await completeOnboarding(page)
    await addLedgerExpense(page, {
      description: 'Paycheck deposit',
      amount: '2000',
      category: 'Food',
    })
    // Income via ledger type toggle if available — expense is enough for chart.
    await page.goto('/year')
    await expect(
      page.getByRole('heading', { name: /Year \d{4}/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('img', { name: /Monthly income and expenses/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Top categories' }),
    ).toBeVisible()
  })

  test('bills composer supports income kind', async ({ page }) => {
    await completeOnboarding(page)
    await goToNav(page, 'Bills')
    await page
      .getByRole('button', { name: /Add recurring/i })
      .first()
      .click()
    await expect(page.getByRole('combobox', { name: 'Type' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Type' }).click()
    await page.getByRole('option', { name: 'Income' }).click()
    await expect(page.getByRole('combobox', { name: 'Category' })).toBeVisible()
  })

  test('backup modal has CSV export and reminders toggle', async ({ page }) => {
    await completeOnboarding(page)
    await goToNav(page, 'Overview')
    await page.getByRole('button', { name: 'Backup', exact: true }).click()
    await expect(
      page.getByRole('button', { name: /Export CSV/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('switch', { name: /Bill reminders/i }),
    ).toBeVisible()
  })
})
