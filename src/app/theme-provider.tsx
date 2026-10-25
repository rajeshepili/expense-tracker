import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { ScriptOnce } from '@tanstack/react-router'

type Theme = 'dark' | 'light' | 'system'

type ThemeOrigin = { x: number; y: number }

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
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

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function withThemeTransition(update: () => void, origin?: ThemeOrigin) {
  const root = document.documentElement

  if (prefersReducedMotion()) {
    update()
    return
  }

  if (origin) {
    root.style.setProperty('--theme-x', `${origin.x}px`)
    root.style.setProperty('--theme-y', `${origin.y}px`)
  } else {
    root.style.setProperty('--theme-x', `${window.innerWidth / 2}px`)
    root.style.setProperty('--theme-y', '0px')
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> }
  }

  if (typeof doc.startViewTransition === 'function') {
    const transition = doc.startViewTransition(() => {
      flushSync(update)
    })
    void transition.finished.finally(() => {
      root.style.removeProperty('--theme-x')
      root.style.removeProperty('--theme-y')
    })
    return
  }

  root.classList.add('theme-transition')
  update()
  window.setTimeout(() => {
    root.classList.remove('theme-transition')
    root.style.removeProperty('--theme-x')
    root.style.removeProperty('--theme-y')
  }, 280)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'expense-tracker-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
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
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      withThemeTransition(() => applyTheme('system'))
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, mounted])

  const setTheme = (next: Theme, origin?: ThemeOrigin) => {
    if (next === theme) return
    localStorage.setItem(storageKey, next)
    withThemeTransition(() => {
      setThemeState(next)
      applyTheme(next)
    }, origin)
  }

  return (
    <ThemeProviderContext value={{ theme, setTheme }}>
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
