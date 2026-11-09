import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { APP_NAME, APP_SETUP_URL, APP_URL } from '#/lib/brand'
import { LandingHome } from '#/components/landing/landing-home'

vi.mock('#/app/mode-toggle', () => ({
  ModeToggle: () => <button type="button">Theme</button>,
}))

vi.mock('#/lib/brand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/brand')>()
  return {
    ...actual,
    SITE_MODE: 'marketing',
  }
})

describe('landing home', () => {
  it('shows brand, get-started, and open-app links', () => {
    render(<LandingHome />)
    expect(screen.getAllByText(APP_NAME).length).toBeGreaterThan(0)

    const setup = screen.getByRole('link', { name: 'Get started' })
    expect(setup.getAttribute('href')).toBe(APP_SETUP_URL)

    const openApps = screen.getAllByRole('link', { name: 'Open app' })
    expect(openApps.length).toBeGreaterThanOrEqual(2)
    expect(openApps.every((el) => el.getAttribute('href') === APP_URL)).toBe(
      true,
    )
  })
})
