import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { ScriptOnce } from '@tanstack/react-router'
import { motion } from '#/lib/motion'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'
type ThemeMotion = 'night' | 'day' | 'same'

export type ThemeOrigin = {
  left: number
  top: number
  width: number
  height: number
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void
}

function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey)
  const fallback = JSON.stringify(defaultTheme)

  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = resolveTheme(theme)
  if (
    root.classList.contains(resolved) &&
    root.style.colorScheme === resolved
  ) {
    return
  }
  root.classList.add(resolved)
  root.classList.remove(resolved === 'dark' ? 'light' : 'dark')
  root.style.colorScheme = resolved
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function motionFor(from: ResolvedTheme, to: ResolvedTheme): ThemeMotion {
  if (from === to) return 'same'
  return to === 'dark' ? 'night' : 'day'
}

const THEME_MOTION_MS = 460

function setRevealGeometry(root: HTMLElement, origin?: ThemeOrigin) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = origin?.width ?? 32
  const height = origin?.height ?? 32
  const x = origin ? origin.left + width / 2 : vw / 2
  const y = origin ? origin.top + height / 2 : 12
  const startR = Math.hypot(width, height) / 2 + 4
  const endR = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y))

  root.style.setProperty('--theme-x', `${x}px`)
  root.style.setProperty('--theme-y', `${y}px`)
  root.style.setProperty('--theme-r0', `${startR}px`)
  root.style.setProperty('--theme-r1', `${endR}px`)
}

function setMotionVars(root: HTMLElement, mode: 'night' | 'day') {
  if (mode === 'night') {
    root.style.setProperty('--theme-vt-new', 'theme-bloom-expand')
    root.style.setProperty('--theme-vt-old', 'none')
    root.style.setProperty('--theme-vt-new-z', '2')
    root.style.setProperty('--theme-vt-old-z', '1')
    root.style.setProperty('--theme-wash', 'theme-wash-ring')
  } else {
    root.style.setProperty('--theme-vt-old', 'theme-bloom-contract')
    root.style.setProperty('--theme-vt-new', 'none')
    root.style.setProperty('--theme-vt-old-z', '2')
    root.style.setProperty('--theme-vt-new-z', '1')
    root.style.removeProperty('--theme-wash')
  }
}

function clearThemeReveal(root: HTMLElement) {
  root.style.removeProperty('--theme-x')
  root.style.removeProperty('--theme-y')
  root.style.removeProperty('--theme-r0')
  root.style.removeProperty('--theme-r1')
  root.style.removeProperty('--theme-vt-new')
  root.style.removeProperty('--theme-vt-old')
  root.style.removeProperty('--theme-vt-new-z')
  root.style.removeProperty('--theme-vt-old-z')
  root.style.removeProperty('--theme-wash')
  root.classList.remove('theme-transition')
}

function withThemeTransition(
  update: () => void,
  options: { origin?: ThemeOrigin; motion: ThemeMotion },
) {
  const root = document.documentElement

  if (prefersReducedMotion() || options.motion === 'same') {
    update()
    return
  }

  if (motion.phase() === 'page' || motion.phase() === 'theme') {
    flushSync(update)
    return
  }

  setRevealGeometry(root, options.origin)
  setMotionVars(root, options.motion)

  let safety = 0
  const release = () => {
    window.clearTimeout(safety)
    clearThemeReveal(root)
  }
  safety = window.setTimeout(release, THEME_MOTION_MS + 180)

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> }
  }

  if (typeof doc.startViewTransition === 'function') {
    // beginTheme already starts the VT — pass the DOM update directly
    // (nested startViewTransition made page-content run route slides).
    void motion.beginTheme(update)
    return
  }

  root.classList.add('theme-transition')
  flushSync(update)
  window.setTimeout(release, THEME_MOTION_MS)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'expense-tracker-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    setThemeState(
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : defaultTheme,
    )
    setMounted(true)
  }, [defaultTheme, storageKey])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
    setResolvedTheme(resolveTheme(theme))
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = resolveTheme('system')
      const prev: ResolvedTheme = next === 'dark' ? 'light' : 'dark'
      withThemeTransition(() => {
        applyTheme('system')
        setResolvedTheme(next)
      }, {
        motion: motionFor(prev, next),
      })
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, mounted])

  const setTheme = (next: Theme, origin?: ThemeOrigin) => {
    if (next === theme) return
    const from = resolveTheme(theme)
    const to = resolveTheme(next)
    localStorage.setItem(storageKey, next)
    withThemeTransition(
      () => {
        applyTheme(next)
        flushSync(() => {
          setThemeState(next)
          setResolvedTheme(to)
        })
      },
      { origin, motion: motionFor(from, to) },
    )
  }

  return (
    <ThemeProviderContext value={{ theme, resolvedTheme, setTheme }}>
      <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
