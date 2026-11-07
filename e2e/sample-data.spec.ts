import { expect, test } from '@playwright/test'
import {
  addLedgerExpense,
  completeOnboarding,
  goToNav,
  tableCell,
} from './helpers'

test.describe('ledger after empty onboard @smoke', () => {
  test('empty onboard then add expense appears in ledger', async ({ page }) => {
    await completeOnboarding(page, { budget: '2500', accountName: 'Checking' })
    await addLedgerExpense(page, {
      description: 'Grocery run',
      amount: '42.50',
    })
    await goToNav(page, 'Ledger')
    await expect(page.getByRole('heading', { name: 'Ledger' })).toBeVisible()
    await expect(tableCell(page, 'Grocery run')).toBeVisible()
  })
})
