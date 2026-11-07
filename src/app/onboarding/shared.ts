import { MARKETING_URL } from '#/lib/brand'

export type WizardStep = 'welcome' | 'money' | 'account' | 'categories'

export function fromMarketingHandoff() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('from') === 'mkt') return true
  try {
    const ref = document.referrer
    if (!ref) return false
    const marketingOrigin = new URL(MARKETING_URL).origin
    return new URL(ref).origin === marketingOrigin
  } catch {
    return false
  }
}

export function clearFromMktParam() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('from')) return
  url.searchParams.delete('from')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(null, '', next || '/')
}

export function stepMeta(
  step: WizardStep,
  fromMkt: boolean,
): { index: number; total: number } {
  const total = fromMkt ? 3 : 4
  if (fromMkt) {
    if (step === 'money') return { index: 1, total }
    if (step === 'account') return { index: 2, total }
    return { index: 3, total }
  }
  if (step === 'welcome') return { index: 1, total }
  if (step === 'money') return { index: 2, total }
  if (step === 'account') return { index: 3, total }
  return { index: 4, total }
}
