import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingScreen } from '#/app/onboarding'
import { APP_NAME } from '#/lib/brand'
import { completeOnboarding } from '#/data/repository'

vi.mock('#/data/repository', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({ alreadyDone: false }),
}))

vi.mock('#/data/backup', () => ({
  restoreBackup: vi.fn(),
}))

vi.mock('#/lib/query/invalidation', () => ({
  invalidateAfter: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('#/lib/motion', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    animateWizardStep: vi.fn(),
  }
})

vi.mock('#/app/mode-toggle', () => ({
  ModeToggle: () => <button type="button">Theme</button>,
}))

vi.mock('#/features/shared/local-data', () => ({
  LocalDataCallout: () => <div>Local data note</div>,
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

function renderWizard(search = '') {
  window.history.replaceState(null, '', `/${search}`)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onComplete = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <OnboardingScreen onComplete={onComplete} />
    </QueryClientProvider>,
  )
  return { onComplete }
}

describe('onboarding wizard', () => {
  beforeEach(() => {
    vi.mocked(completeOnboarding).mockClear()
    window.history.replaceState(null, '', '/')
  })

  it('cold visit starts on Welcome without marketing exits', () => {
    renderWizard()
    expect(screen.getAllByText(APP_NAME).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole('heading', { name: 'Set up your ledger' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restore a backup' })).toBeTruthy()
    expect(document.querySelector('.landing-mock')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Features' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Privacy' })).toBeNull()
    expect(screen.queryByRole('link', { name: APP_NAME })).toBeNull()
  })

  it('from=mkt skips Welcome and opens Money', () => {
    renderWizard('?from=mkt')
    expect(
      screen.getByRole('heading', { name: 'Currency & budget' }),
    ).toBeTruthy()
    expect(screen.getByText(/Ledger storage starts on this device/i)).toBeTruthy()
    expect(
      screen.queryByRole('heading', { name: 'Set up your ledger' }),
    ).toBeNull()
  })

  it('walks Welcome → Money → Account → Categories and completes', async () => {
    const { onComplete } = renderWizard()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      screen.getByRole('heading', { name: 'Currency & budget' }),
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Default monthly budget/i), {
      target: { value: '1800' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'First account' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/^Name$/i), {
      target: { value: 'Everyday' },
    })
    fireEvent.change(screen.getByLabelText(/Starting balance/i), {
      target: { value: '100' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Select common' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }))

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith({
        budget: 1800,
        currency: 'USD',
        primaryAccount: {
          name: 'Everyday',
          type: 'asset',
          startingBalance: 100,
        },
        expenseCategoryNames: ['Food', 'Housing', 'Transport', 'Other'],
      })
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('allows Income-only (no expense categories)', async () => {
    const { onComplete } = renderWizard()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }))

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          expenseCategoryNames: [],
        }),
      )
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
