import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  MarketingPage,
  MarketingFooter,
  MarketingTopbar,
} from '#/components/landing/marketing-page'
import { APP_NAME, APP_URL } from '#/lib/brand'

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

function renderChrome() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <MarketingPage
        title="Test page"
        description="desc"
        cta={{ label: 'Get started', href: 'https://example.com/?from=mkt' }}
      >
        <p>content</p>
      </MarketingPage>
    </QueryClientProvider>,
  )
}

describe('marketing chrome', () => {
  it('renders wordmark, nav, hero, CTA, footer Open app only', () => {
    renderChrome()
    const wordmarks = screen.getAllByText(APP_NAME)
    expect(wordmarks.length).toBe(2)
    expect(screen.getByRole('heading', { name: 'Test page' })).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Marketing' })
    expect(nav.textContent).toContain('Home')
    expect(nav.textContent).toContain('Features')
    expect(nav.textContent).toContain('Privacy')
    expect(screen.getByRole('link', { name: 'Get started' })).toBeTruthy()
    expect(screen.getByText('content')).toBeTruthy()

    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(footer.textContent).toContain('Open app')
    expect(footer.textContent).not.toContain('Get started')
    const openApp = screen.getByRole('link', { name: 'Open app' })
    expect(openApp.getAttribute('href')).toBe(APP_URL)
    expect(openApp.getAttribute('rel')).toBe('noopener')
  })
})

describe('marketing page exports', () => {
  it('topbar and footer are separate components', () => {
    expect(typeof MarketingTopbar).toBe('function')
    expect(typeof MarketingFooter).toBe('function')
  })
})
