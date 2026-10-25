import { useRef } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useTheme } from '#/app/theme-provider'

const THEME_ORDER = ['light', 'dark', 'system'] as const

type ThemeChoice = (typeof THEME_ORDER)[number]

function nextTheme(current: string): ThemeChoice {
  const index = THEME_ORDER.indexOf(current as ThemeChoice)
  return THEME_ORDER[index === -1 ? 0 : (index + 1) % THEME_ORDER.length]
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const upcoming = nextTheme(theme)

  function cycle() {
    const el = buttonRef.current
    const origin = el
      ? (() => {
        const rect = el.getBoundingClientRect()
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
      })()
      : undefined
    setTheme(upcoming, origin)
  }

  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      aria-label={`Theme: ${theme}. Switch to ${upcoming}`}
      title={`Theme: ${theme}`}
      onClick={cycle}
    >
      <span key={theme} className="animate-icon-rotate">
        <Icon aria-hidden="true" className="size-4" />
      </span>
    </Button>
  )
}
