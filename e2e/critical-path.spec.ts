import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  deleteFromDetailSheet,
  dialogSave,
  exportBackupToFile,
  goToNav,
  openRowDetail,
  selectOption,
  tableCell,
} from './helpers'

test.describe('critical path smoke @smoke', () => {
  test('onboard → ledger CRUD → recurring record → backup export', async ({
    page,
  }) => {
    await completeOnboarding(page, { budget: '2000' })

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
    await openRowDetail(page, /Smoke coffee/)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Edit', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Edit transaction' }),
    ).toBeVisible()
    const description = page.locator('#ledger-description')
    await expect(description).toHaveValue('Smoke coffee')
    // Clear + type so React controlled state tracks (fill alone can desync).
    await description.click()
    await description.press('ControlOrMeta+A')
    await description.pressSequentially('Smoke latte', { delay: 15 })
    await expect(description).toHaveValue('Smoke latte')
    await dialogSave(page)
    await expect(page.getByRole('row', { name: /Smoke latte/ })).toBeVisible()
    await expect(page.getByRole('row', { name: /Smoke coffee/ })).toHaveCount(0)

    // ——— Delete transaction ———
    await openRowDetail(page, /Smoke latte/)
    await deleteFromDetailSheet(page, /Delete “Smoke latte”/)
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
      .getByRole('button', { name: /Add bill/i })
      .first()
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

    // Bills are sectioned cards (not a table).
    const bill = page.getByRole('button', { name: /Smoke internet/ })
    await expect(bill).toBeVisible()
    await bill.getByRole('button', { name: 'Record', exact: true }).click()
    await expect(bill).toBeVisible()
    await expect(
      bill.getByRole('button', { name: 'Record', exact: true }),
    ).toHaveCount(0)

    // ——— Backup export ———
    await exportBackupToFile(page)
  })
})
