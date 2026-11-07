import { expect, test } from '@playwright/test'
import {
  addLedgerExpense,
  completeOnboarding,
  exportBackupToFile,
  goToNav,
  openRowActions,
  restoreBackupFromFile,
  tableCell,
  writeTempFile,
} from './helpers'

test.describe('backup restore smoke @smoke', () => {
  test('export → delete → merge restore brings data back', async ({ page }) => {
    await completeOnboarding(page, { budget: '2000' })
    await addLedgerExpense(page, {
      description: 'Restore marker',
      amount: '12.34',
    })

    const backupPath = await exportBackupToFile(page)

    // delete before merge restore
    await goToNav(page, 'Ledger')
    await openRowActions(page, 'Restore marker')
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: /Delete “Restore marker”/ }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(tableCell(page, 'Restore marker')).toHaveCount(0)

    await restoreBackupFromFile(page, backupPath, 'merge')

    await goToNav(page, 'Ledger')
    await expect(tableCell(page, 'Restore marker')).toBeVisible()
  })

  test('merge keeps local rows not in the backup', async ({ page }) => {
    await completeOnboarding(page, { budget: '2000' })
    await addLedgerExpense(page, {
      description: 'Exported meal',
      amount: '10',
    })
    const backupPath = await exportBackupToFile(page)

    await addLedgerExpense(page, {
      description: 'Local only',
      amount: '20',
    })

    await restoreBackupFromFile(page, backupPath, 'merge')

    await goToNav(page, 'Ledger')
    await expect(tableCell(page, 'Exported meal')).toBeVisible()
    await expect(tableCell(page, 'Local only')).toBeVisible()
  })

  test('rejects invalid restore file', async ({ page }) => {
    await completeOnboarding(page, { budget: '2000' })
    const junk = await writeTempFile('not-a-db.sqlite3', 'this is not sqlite\n')

    await page.getByRole('button', { name: 'Backup', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Local backup' }),
    ).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(junk)
    await expect(page.getByText(/Selected:/)).toBeVisible()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Merge & reload' })
      .click()
    await expect(page.getByRole('alert')).toContainText(/not a valid SQLite/i)
    // invalid file: stay on dialog
    await expect(
      page.getByRole('heading', { name: 'Local backup' }),
    ).toBeVisible()
  })
})
