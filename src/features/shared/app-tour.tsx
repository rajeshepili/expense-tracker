'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { TourProvider, useTour } from '#/components/ui/tour'
import type { TourStep } from '#/components/ui/tour'
import { APP_NAME } from '#/lib/brand'
import { isTourDone, markTourDone } from '#/lib/tour'
import { motion } from '#/lib/motion'

const STEPS: TourStep[] = [
  {
    title: `Welcome to ${APP_NAME}`,
    content:
      "This URL is your ledger — everything lives only in this browser. Let's take a quick look around.",
  },
  {
    target: () =>
      [...document.querySelectorAll<HTMLElement>('[data-tour="nav"]')].find(
        (el) => el.getBoundingClientRect().width > 0,
      ) ?? null,
    side: 'top',
    title: 'Navigate',
    content:
      'Overview, Ledger, Bills, Categories, and Goals — always one tap away.',
  },
  {
    target: '[data-tour="stats"]',
    side: 'bottom',
    title: 'This month at a glance',
    content:
      'Tap Income or Expenses to open the ledger filtered to that type for the month.',
  },
  {
    target: '[data-tour="recent"]',
    side: 'top',
    title: 'Recent transactions',
    content: 'Tap a row to edit it in the ledger.',
  },
  {
    target: '[data-tour="add"]',
    side: 'bottom',
    title: 'Add an expense or income',
    content: 'Or press N anywhere to add a transaction.',
  },
  {
    title: "You're all set",
    content:
      'Data stays on this device — use Backup to export a .sqlite3 copy.',
  },
]

function TourAutoStart({ steps }: { steps: TourStep[] }) {
  const tour = useTour()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const timerRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (pathname !== '/') tour.stop()
  }, [pathname, tour])

  useEffect(() => {
    if (startedRef.current) return
    if (isTourDone()) return
    if (pathname !== '/') return
    const tryStart = () => {
      const targetsReady = steps.every((step) => {
        if (!step.target) return true
        let el: Element | null = null
        if (typeof step.target === 'function') el = step.target()
        else if (typeof step.target === 'string')
          el = document.querySelector(step.target)
        else el = step.target.current
        return el instanceof HTMLElement && el.getBoundingClientRect().width > 0
      })
      if (!targetsReady || !motion.can('overlay')) {
        timerRef.current = window.setTimeout(tryStart, 150)
        return
      }
      startedRef.current = true
      void motion.openOverlay('tour').then(() => tour.start(steps))
    }
    timerRef.current = window.setTimeout(tryStart, 600)
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [pathname, steps, tour])

  return null
}

export function AppTour() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <TourProvider
      steps={STEPS}
      padding={8}
      radius={12}
      overlayClick="stop"
      labels={{ back: 'Back', next: 'Next', done: 'Done' }}
      onEnd={() => {
        motion.closeOverlay('tour')
        markTourDone()
      }}
    >
      <TourAutoStart steps={STEPS} />
    </TourProvider>
  )
}
