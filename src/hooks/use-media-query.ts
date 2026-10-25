import { useSyncExternalStore } from 'react'

function subscribe(query: string, onChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind `md` (768px). */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}
