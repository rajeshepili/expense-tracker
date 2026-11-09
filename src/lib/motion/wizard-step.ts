import { animateChrome } from './animate-chrome'
import { prefersReducedMotion } from './reduced'

export type WizardStepDirection = 'forward' | 'back'

export function animateWizardStep(el: Element, direction: WizardStepDirection) {
  if (prefersReducedMotion()) {
    return animateChrome(el, { opacity: [0, 1], transform: 'none' })
  }
  const fromX = direction === 'forward' ? '16px' : '-16px'
  return animateChrome(el, {
    opacity: [0, 1],
    transform: [`translateX(${fromX})`, 'translateX(0px)'],
  })
}
