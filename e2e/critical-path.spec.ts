import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  dialogSave,
  exportBackupToFile,
  goToNav,
  openRowActions,
  selectOption,
  tableCell,
  tableRow,
} from './helpers'

test.describe('critical path smoke @smoke', () => {
  test('onboard → ledger CRUD → recurring record → backup export', async ({
    page,
  }) => {
    await completeOnboarding(page, { mode: 'empty', budget: '2000' })

    // ——— Add transaction ———
    await goToNav(page, 'Ledger')
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible()

    await page
      .getByRole('button', { name: 'Add transaction N', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Add transaction' }),
    ).toBeVisible()

    await page.locator('#ledger-description').fill('Smoke coffee')
    await page.locator('#ledger-amount').fill('4.50')
    const categoryTrigger = page.locator('#ledger-category')
    if ((await categoryTrigger.innerText()).match(/Choose category/i)) {
      await selectOption(page, 'ledger-category', 'Food')
    }
    await dialogSave(page)

    await expect(tableCell(page, 'Smoke coffee')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Add transaction' }),
    ).toBeHidden()

    // ——— Edit transaction ———
    await openRowActions(page, 'Smoke coffee')
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await expect(
      page.getByRole('heading', { name: 'Edit transaction' }),
    ).toBeVisible()
    await page.locator('#ledger-description').fill('Smoke latte')
    await page.locator('#ledger-amount').fill('5.25')
    await dialogSave(page)
    await expect(tableCell(page, 'Smoke latte')).toBeVisible()
    await expect(tableCell(page, 'Smoke coffee')).toHaveCount(0)

    // ——— Delete transaction ———
    await openRowActions(page, 'Smoke latte')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: /Delete “Smoke latte”/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(tableCell(page, 'Smoke latte')).toHaveCount(0)
    // Empty fill is outside <table> when there are no rows (virtualized list).
    await expect(
      page.locator('[data-slot="empty-title"]').filter({
        hasText: /No transactions/,
      }),
    ).toBeVisible()

    // ——— Add recurring + record ———
    await goToNav(page, 'Bills')
    await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible()

    await page
      .getByRole('button', { name: 'Add recurring N', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Add recurring expense' }),
    ).toBeVisible()
    await page.locator('#recurring-name').fill('Smoke internet')
    await page.locator('#recurring-amount').fill('40')
    if (
      (await page.locator('#recurring-category').innerText()).match(
        /Choose category/i,
      )
    ) {
      await selectOption(page, 'recurring-category', 'Housing')
    }
    await dialogSave(page)

    const billRow = tableRow(page, /Smoke internet/)
    await expect(billRow).toBeVisible()

    await billRow.getByRole('button', { name: 'Record', exact: true }).click()
    await expect(billRow).toBeVisible()
    await expect(
      billRow.getByRole('button', { name: 'Record', exact: true }),
    ).toHaveCount(0)

    // ——— Backup export ———
    await exportBackupToFile(page)
  })
})
