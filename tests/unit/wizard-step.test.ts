import { beforeEach, describe, expect, it, vi } from 'vitest'

const animateChromeMock = vi.hoisted(() =>
  vi.fn(() => ({ stop: vi.fn() })),
)

vi.mock('#/lib/motion/animate-chrome', () => ({
  animateChrome: animateChromeMock,
}))

vi.mock('#/lib/motion/reduced', () => ({
  prefersReducedMotion: () => false,
}))

describe('animateWizardStep', () => {
  beforeEach(() => {
    animateChromeMock.mockClear()
  })

  it('forwards direction keyframes through animateChrome', async () => {
    const { animateWizardStep } = await import('#/lib/motion/wizard-step')
    const el = document.createElement('div')
    animateWizardStep(el, 'forward')
    expect(animateChromeMock).toHaveBeenCalledWith(
      el,
      expect.objectContaining({
        opacity: [0, 1],
        transform: ['translateX(16px)', 'translateX(0px)'],
      }),
    )
  })

  it('mirrors back direction', async () => {
    const { animateWizardStep } = await import('#/lib/motion/wizard-step')
    const el = document.createElement('div')
    animateWizardStep(el, 'back')
    expect(animateChromeMock).toHaveBeenCalledWith(
      el,
      expect.objectContaining({
        transform: ['translateX(-16px)', 'translateX(0px)'],
      }),
    )
  })
})
