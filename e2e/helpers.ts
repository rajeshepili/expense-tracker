import { expect } from '@playwright/test'
import type { Download, Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

/** Wait until OPFS/SQLite bootstrap finishes (onboarding or shell). */
export async function waitForAppReady(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Set up this device' }).or(
      page.getByRole('navigation', { name: 'Primary' }),
    ),
  ).toBeVisible({ timeout: 60_000 })
}

export async function completeOnboarding(
  page: Page,
  options: { mode?: 'empty' | 'sample'; budget?: string } = {},
) {
  const { mode = 'empty', budget = '2500' } = options

  await waitForAppReady(page)

  const setup = page.getByRole('heading', { name: 'Set up this device' })
  if (!(await setup.isVisible().catch(() => false))) {
    // Already seeded in this browser context.
    return
  }

  // Landing hero sits above setup — ensure the form is in view before filling.
  await page.getByRole('button', { name: 'Get started' }).click()
  await expect(setup).toBeInViewport()

  await page.getByLabel(/Default monthly budget/i).fill(budget)
  await page
    .getByRole('button', {
      name: mode === 'sample' ? /Load sample data/i : /Start empty/i,
    })
    .click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({
    timeout: 60_000,
  })

  // Tour auto-starts ~600ms after Overview with an inert full-screen blocker.
  // Close it before the backup nudge, or Later stays unclickable.
  const closeTour = page.getByRole('button', { name: /Skip|Close tour|Got it/i })
  try {
    await closeTour.waitFor({ state: 'visible', timeout: 5_000 })
    await closeTour.click()
    await expect(page.locator('[data-slot="tour-blocker"]')).toBeHidden({
      timeout: 5_000,
    })
  } catch {
    // Tour already done / skipped in this context.
  }

  // First-run backup nudge — dismiss so it does not cover actions.
  const later = page.getByRole('button', { name: 'Later' })
  if (await later.isVisible().catch(() => false)) {
    await later.click({ timeout: 10_000 })
  }
}

export async function goToNav(
  page: Page,
  label: 'Ledger' | 'Bills' | 'Overview' | 'Categories' | 'Goals',
) {
  // Ensure app is ready (handles post-restore reload)
  await waitForAppReady(page)
  const nav = page.getByRole('navigation', { name: 'Primary' })
  const link = nav.getByRole('link', { name: label })
  await expect(link).toBeVisible({ timeout: 15_000 })
  await link.click()
  await page.waitForLoadState('domcontentloaded')
}

export async function selectOption(
  page: Page,
  triggerId: string,
  optionName: string | RegExp,
) {
  await page.locator(`#${triggerId}`).click()
  await page.getByRole('option', { name: optionName }).click()
}

/** Wide viewport (≥1024) mounts the table (useIsCompact); smoke tests use Desktop Chrome. */
export function tableCell(page: Page, text: string) {
  return page.locator('table').getByRole('cell', { name: text, exact: true })
}

export function tableRow(page: Page, name: string | RegExp) {
  return page.locator('table').getByRole('row', { name })
}

export async function dialogSave(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
}

export async function openBackupModal(page: Page) {
  await goToNav(page, 'Overview')
  await page.getByRole('button', { name: /Backup/i }).click()
  await expect(
    page.getByRole('heading', { name: 'Local backup' }),
  ).toBeVisible()
}

export async function exportBackupToFile(page: Page): Promise<string> {
  await openBackupModal(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    /expense-tracker-backup-.*\.sqlite3$/,
  )
  await expect(page.getByText(/Saved expense-tracker-backup/i)).toBeVisible()
  const pathOnDisk = await saveDownload(download)
  // Close modal so nav / page actions are clickable again.
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Local backup' })).toBeHidden()
  return pathOnDisk
}

/** Prefer desktop table action (Radix menus need a real, non-forced click). */
export async function openRowActions(page: Page, label: string) {
  await expect(tableCell(page, label)).toBeVisible()
  // Virtualized rows remount — retry once if the trigger detaches mid-click.
  for (let attempt = 0; attempt < 2; attempt++) {
    const trigger = page
      .locator('table')
      .getByRole('button', { name: `Actions for ${label}` })
      .first()
    await expect(trigger).toBeVisible()
    try {
      await trigger.click({ timeout: 5_000 })
      await expect(page.getByRole('menu')).toBeVisible({ timeout: 5_000 })
      return
    } catch (error) {
      if (attempt === 1) throw error
    }
  }
}

async function saveDownload(download: Download): Promise<string> {
  const dir = path.join(tmpdir(), 'expense-tracker-e2e')
  await mkdir(dir, { recursive: true })
  const target = path.join(dir, download.suggestedFilename())
  await download.saveAs(target)
  return target
}

/** Create a ledger expense; assumes empty onboard catalog (Food exists). */
export async function addLedgerExpense(
  page: Page,
  opts: { description: string; amount: string; category?: string },
) {
  await goToNav(page, 'Ledger')
  await page
    .getByRole('button', { name: 'Add transaction N', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Add transaction' }),
  ).toBeVisible()
  await page.locator('#ledger-description').fill(opts.description)
  await page.locator('#ledger-amount').fill(opts.amount)
  const categoryTrigger = page.locator('#ledger-category')
  if ((await categoryTrigger.innerText()).match(/Choose category/i)) {
    await selectOption(page, 'ledger-category', opts.category ?? 'Food')
  }
  await dialogSave(page)
  await expect(tableCell(page, opts.description)).toBeVisible()
}

export async function restoreBackupFromFile(page: Page, filePath: string) {
  await openBackupModal(page)
  await page.locator('input[type="file"]').setInputFiles(filePath)
  await expect(page.getByText(/Selected:/)).toBeVisible()

  await Promise.all([
    page.waitForLoadState('load'),
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Restore & reload' })
      .click(),
  ])

  const ready = page
    .getByRole('navigation', { name: 'Primary' })
    .or(page.getByRole('heading', { name: 'Set up this device' }))

  try {
    await expect(ready).toBeVisible({ timeout: 45_000 })
  } catch {
    // OPFS overwrite + full reload can stall once on the gate spinner.
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(ready).toBeVisible({ timeout: 60_000 })
  }

  const later = page.getByRole('button', { name: 'Later' })
  if (await later.isVisible().catch(() => false)) {
    await later.click()
  }
}

/** Write bytes to a temp sqlite-named file (for invalid restore tests). */
export async function writeTempFile(
  name: string,
  contents: Buffer | string,
): Promise<string> {
  const dir = path.join(tmpdir(), 'expense-tracker-e2e')
  await mkdir(dir, { recursive: true })
  const target = path.join(dir, name)
  await writeFile(target, contents)
  return target
}
