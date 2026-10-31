import { expect, test } from '@playwright/test'
import {
  addLedgerExpense,
  completeOnboarding,
  exportBackupToFile,
  goToNav,
  restoreBackupFromFile,
  tableCell,
  writeTempFile,
} from './helpers'

test.describe('backup restore smoke @smoke', () => {
  test('export → mutate → restore brings data back', async ({ page }) => {
    await completeOnboarding(page, { mode: 'empty', budget: '2000' })
    await addLedgerExpense(page, {
      description: 'Restore marker',
      amount: '12.34',
    })

    const backupPath = await exportBackupToFile(page)

    // Wipe the marker so restore has something to prove.
    await goToNav(page, 'Ledger')
    await page
      .locator('table')
      .getByRole('button', { name: 'Actions for Restore marker' })
      .click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(tableCell(page, 'Restore marker')).toHaveCount(0)

    await restoreBackupFromFile(page, backupPath)

    await goToNav(page, 'Ledger')
    await expect(tableCell(page, 'Restore marker')).toBeVisible()
  })

  test('rejects invalid restore file', async ({ page }) => {
    await completeOnboarding(page, { mode: 'empty', budget: '2000' })
    const junk = await writeTempFile(
      'not-a-db.sqlite3',
      'this is not sqlite\n',
    )

    await page.getByRole('button', { name: /Backup/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Local backup' }),
    ).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles(junk)
    await expect(page.getByText(/Selected:/)).toBeVisible()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Restore & reload' })
      .click()
    await expect(page.getByRole('alert')).toContainText(
      /not a valid SQLite/i,
    )
    // Still on overview — no reload into empty onboarding.
    await expect(page.getByRole('heading', { name: 'Local backup' })).toBeVisible()
  })
})
