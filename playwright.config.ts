import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PW_PORT ?? 4173)
const BASE_URL = process.env.PW_BASE_URL ?? `http://127.0.0.1:${PORT}`

/**
 * Chromium-only: SQLocal / OPFS needs SharedArrayBuffer (COEP/COOP),
 * which the Vite `sqlocal()` plugin sets in dev.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // SW + Vite dev module URLs break hard reloads (backup restore).
    serviceWorkers: 'block',
    ...devices['Desktop Chrome'],
    // Tall enough that Categories table + accounts panel both fit.
    viewport: { width: 1280, height: 1100 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite dev --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    // Local only: reuse a healthy server. Stale/wedged Vite+Nitro runners cause
    // "transport invoke timed out" then 120s webServer wait — kill the port first.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
