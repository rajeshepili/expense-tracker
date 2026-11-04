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

/** Phone-only: bottom tabs + compact top bar (`md` / 768px). */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}

/** Phone + tablet: list rows, drawers, compact chrome until `lg` / 1024px. */
export function useIsCompact() {
  return useMediaQuery('(max-width: 1023px)')
}
