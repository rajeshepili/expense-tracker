import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { APP_NAME, APP_SETUP_URL, APP_URL } from '#/lib/brand'
import { MarketingHome } from '#/components/landing/marketing-home'

vi.mock('#/app/mode-toggle', () => ({
  ModeToggle: () => <button type="button">Theme</button>,
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    Link: (props: { to: string; children: ReactNode; className?: string }) => (
      <a href={String(props.to)} className={props.className}>
        {props.children}
      </a>
    ),
  }
})

describe('marketing home', () => {
  it('uses shared topbar Get started and hero returner to Open app', () => {
    render(<MarketingHome />)
    expect(screen.getAllByText(APP_NAME).length).toBeGreaterThan(0)

    const setup = screen.getAllByRole('link', { name: 'Get started' })
    expect(setup.length).toBeGreaterThanOrEqual(2) // topbar + hero
    expect(setup.every((el) => el.getAttribute('href') === APP_SETUP_URL)).toBe(
      true,
    )

    const returner = screen.getByRole('link', {
      name: /Already using Pocketbook\? Open app/i,
    })
    expect(returner.getAttribute('href')).toBe(APP_URL)

    const footerOpen = screen.getByRole('link', { name: 'Open app' })
    expect(footerOpen.getAttribute('href')).toBe(APP_URL)

    // Footer must not duplicate Get started
    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(footer.querySelector('a[href*="from=mkt"]')).toBeNull()
  })
})
