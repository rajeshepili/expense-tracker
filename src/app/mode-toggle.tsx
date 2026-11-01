import { useRef } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useTheme } from '#/app/theme-provider'
import type { ThemeOrigin } from '#/app/theme-provider'

const THEME_ORDER = ['light', 'dark', 'system'] as const

type ThemeChoice = (typeof THEME_ORDER)[number]

function nextTheme(current: string): ThemeChoice {
  const index = THEME_ORDER.indexOf(current as ThemeChoice)
  return THEME_ORDER[index === -1 ? 0 : (index + 1) % THEME_ORDER.length]
}

function originFromButton(el: HTMLButtonElement): ThemeOrigin {
  const rect = el.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const upcoming = nextTheme(theme)

  function cycle() {
    const el = buttonRef.current
    setTheme(upcoming, el ? originFromButton(el) : undefined)
  }

  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon"
      className="min-h-11 min-w-11 shrink-0 touch-manipulation md:min-h-8 md:min-w-8"
      aria-label={`Theme: ${theme}. Switch to ${upcoming}`}
      title={`Theme: ${theme}`}
      onClick={cycle}
    >
      <span key={theme} className="animate-icon-swap">
        <Icon aria-hidden="true" className="size-4" />
      </span>
    </Button>
  )
}
