import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  dialogSave,
  goToNav,
  selectOption,
  tableCell,
} from './helpers'

test.describe('ledger transfers @smoke', () => {
  test('create transfer pair → edit note → delete both legs', async ({
    page,
  }) => {
    await completeOnboarding(page, { budget: '2000' })

    // Transfers need 2+ accounts — onboarding only creates one.
    await goToNav(page, 'Categories')
    await page.getByRole('button', { name: /Add account/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Add account' }),
    ).toBeVisible()
    await page.locator('#account-name').fill('Cash')
    await dialogSave(page)
    await expect(tableCell(page, 'Cash')).toBeVisible()

    await goToNav(page, 'Ledger')
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible()

    await page
      .getByRole('button', { name: 'Add transaction N', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Add transaction' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Transfer', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Add transfer' }),
    ).toBeVisible()

    await page.locator('#ledger-amount').fill('75.00')
    await page.locator('#ledger-description').fill('E2E pocket move')
    await selectOption(page, 'ledger-from-account', 'Checking')
    await selectOption(page, 'ledger-to-account', 'Cash')
    await dialogSave(page)

    await expect(tableCell(page, 'E2E pocket move')).toHaveCount(2)
    await expect(page.getByText('Transfer out').first()).toBeVisible()
    await expect(page.getByText('Transfer in').first()).toBeVisible()

    // Two legs share the same description — act on the first row.
    await page
      .locator('table')
      .getByRole('button', { name: 'Actions for E2E pocket move' })
      .first()
      .click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Edit transfer' }),
    ).toBeVisible()
    await page.locator('#ledger-description').fill('E2E pocket move edited')
    await dialogSave(page)

    await expect(tableCell(page, 'E2E pocket move edited')).toHaveCount(2)
    await expect(tableCell(page, 'E2E pocket move')).toHaveCount(0)

    await page
      .locator('table')
      .getByRole('button', { name: 'Actions for E2E pocket move edited' })
      .first()
      .click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: /Delete transfer/ }),
    ).toBeVisible()
    await expect(
      page.getByText(/Both linked transfer legs will be removed/),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(tableCell(page, 'E2E pocket move edited')).toHaveCount(0)
  })
})
