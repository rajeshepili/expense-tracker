import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from 'cn'

export function InstallNudge() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isCoarse = window.matchMedia('(pointer: coarse)').matches

    if (isStandalone || !isCoarse) return

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)

    const dismissed = localStorage.getItem('install-nudge-dismissed')
    const dismissedTime = dismissed ? Number(dismissed) : 0
    if (!dismissed || Date.now() - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => setShow(true), 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className={cn(
        'fixed bottom-[calc(var(--tab-bar-h)+1rem)] left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-[320px] z-50 animate-slide-up',
        'pointer:coarse',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border bg-card p-4 shadow-lg ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install Expense Tracker</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add to Home Screen for offline access and an app-like experience.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => {
              localStorage.setItem('install-nudge-dismissed', String(Date.now()))
              setShow(false)
            }}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
        {deferredPrompt ? (
          <Button
            className="mt-3 w-full"
            size="sm"
            onClick={async () => {
              setShow(false)
              deferredPrompt.prompt()
              const { outcome } = await deferredPrompt.userChoice
              if (outcome === 'accepted') {
                setDeferredPrompt(null)
              }
            }}
          >
            Install
          </Button>
        ) : (
          <Button
            className="mt-3 w-full"
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.setItem('install-nudge-dismissed', String(Date.now()))
              setShow(false)
            }}
          >
            Got it
          </Button>
        )}
      </div>
    </div>
  )
}