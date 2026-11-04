import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingScreen } from '#/app/onboarding'
import { APP_NAME, APP_TAGLINE } from '#/lib/brand'

vi.mock('#/data/repository', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({ alreadyDone: false }),
}))

vi.mock('#/lib/query/invalidation', () => ({
  invalidateAfter: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('#/app/mode-toggle', () => ({
  ModeToggle: () => <button type="button">Theme</button>,
}))

vi.mock('#/components/local-data', () => ({
  LocalDataCallout: () => <div>Local data note</div>,
}))

function renderLanding() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <OnboardingScreen onComplete={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('Pocketbook landing + setup', () => {
  it('shows brand hero and setup section', () => {
    renderLanding()
    expect(screen.getAllByText(APP_NAME).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(APP_TAGLINE)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Get started' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Set up this device' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(document.getElementById('setup')).toBeTruthy()
  })

  it('scrolls to setup without adding a hash', () => {
    const scrollIntoView = vi.fn()
    renderLanding()
    const setup = document.getElementById('setup')
    expect(setup).toBeTruthy()
    if (setup) setup.scrollIntoView = scrollIntoView

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(scrollIntoView).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    expect(
      document.querySelector('.landing-page')?.classList.contains(
        'landing-page--setup',
      ),
    ).toBe(true)
  })

  it('renders the product overview mock', () => {
    renderLanding()
    expect(document.querySelector('.landing-mock')).toBeTruthy()
    expect(screen.getByText('Overview')).toBeTruthy()
  })
})
