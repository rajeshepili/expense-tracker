import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  dialogSave,
  goToNav,
  openRowActions,
  selectOption,
  tableCell,
} from './helpers'

test.describe('categories smoke @smoke', () => {
  test('add → edit → delete category and payment method', async ({ page }) => {
    await completeOnboarding(page, { mode: 'empty', budget: '2000' })
    await goToNav(page, 'Categories')
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()

    // ——— Add category ———
    await page.getByRole('button', { name: /Add category/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Add category' }),
    ).toBeVisible()
    await page.locator('#category-name').fill('Smoke Pets')
    await selectOption(page, 'category-type', 'Expense')
    await dialogSave(page)
    await expect(tableCell(page, 'Smoke Pets')).toBeVisible()

    // ——— Edit category ———
    await openRowActions(page, 'Smoke Pets')
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Edit category' }),
    ).toBeVisible()
    await page.locator('#category-name').fill('Smoke Pets Renamed')
    await dialogSave(page)
    await expect(tableCell(page, 'Smoke Pets Renamed')).toBeVisible()
    await expect(tableCell(page, 'Smoke Pets')).toHaveCount(0)

    // ——— Delete unused category ———
    await openRowActions(page, 'Smoke Pets Renamed')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: /Delete “Smoke Pets Renamed”/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(tableCell(page, 'Smoke Pets Renamed')).toHaveCount(0)

    // ——— Payment method CRUD on same page ———
    await page.getByRole('button', { name: /Add method/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Add method' }),
    ).toBeVisible()
    await page.locator('#method-name').fill('Smoke Wallet')
    await dialogSave(page)
    await expect(tableCell(page, 'Smoke Wallet')).toBeVisible()

    await openRowActions(page, 'Smoke Wallet')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: /Delete “Smoke Wallet”/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(tableCell(page, 'Smoke Wallet')).toHaveCount(0)
  })
})
