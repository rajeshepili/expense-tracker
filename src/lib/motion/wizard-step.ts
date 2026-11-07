import { animateChrome } from './animate-chrome'
import { prefersReducedMotion } from './reduced'

export type WizardStepDirection = 'forward' | 'back'

/**
 * Interruptible wizard step enter (critically damped chrome spring).
 * Rapid retargets cancel the previous run via animateChrome.
 */
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
