import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  LandingPage,
  LandingFooter,
  LandingTopbar,
} from '#/components/landing/landing-page'
import { APP_NAME, APP_URL } from '#/lib/brand'

vi.mock('#/app/mode-toggle', () => ({
  ModeToggle: () => <button type="button">Theme</button>,
}))

function renderChrome() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <LandingPage
        title="Test page"
        description="desc"
        cta={{ label: 'Get started', href: 'https://example.com/?from=mkt' }}
      >
        <p>content</p>
      </LandingPage>
    </QueryClientProvider>,
  )
}

describe('landing chrome', () => {
  it('renders wordmark, CTA, and footer Open app', () => {
    renderChrome()
    expect(screen.getAllByText(APP_NAME).length).toBe(2)
    expect(screen.getByRole('heading', { name: 'Test page' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Get started' })).toBeTruthy()
    expect(screen.getByText('content')).toBeTruthy()

    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(footer.textContent).toContain('Open app')
    expect(footer.textContent).not.toContain('Get started')
    const openApp = screen.getByRole('link', { name: 'Open app' })
    expect(openApp.getAttribute('href')).toBe(APP_URL)
  })
})

describe('landing page exports', () => {
  it('exports topbar and footer', () => {
    expect(typeof LandingTopbar).toBe('function')
    expect(typeof LandingFooter).toBe('function')
  })
})
