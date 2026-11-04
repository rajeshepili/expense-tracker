import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ModeToggle } from '#/app/mode-toggle'
import { LandingProductMock } from '#/components/landing/product-mock'
import { LocalDataCallout } from '#/components/local-data'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { completeOnboarding } from '#/data/repository'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
} from '#/lib/brand'
import { CURRENCIES, currencyLabel, isCurrencyCode, money } from '#/lib/finance'
import { motion } from '#/lib/motion'
import { invalidateAfter } from '#/lib/query/invalidation'
import { cn } from 'cn'

type StartMode = 'empty' | 'sample'

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient()
  const [currency, setCurrency] = useState('USD')
  const [budget, setBudget] = useState('2500')
  const [mode, setMode] = useState<StartMode>('empty')
  const setupHeadingRef = useRef<HTMLHeadingElement>(null)
  const currencyTriggerRef = useRef<HTMLButtonElement>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const amount = Number(budget)
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Enter a valid monthly budget (0 or more)')
      }
      const code = currency.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(code)) {
        throw new Error('Choose a valid currency')
      }
      try {
        money(0, code)
      } catch {
        throw new Error('Choose a valid currency')
      }
      await completeOnboarding({
        budget: amount,
        currency: code,
        loadSample: mode === 'sample',
      })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'settings',
        'transactions',
        'recurring',
        'categories',
        'paymentMethods',
        'accounts',
      ])
      onComplete()
    },
  })

  function goToSetup() {
    const setup = document.getElementById('setup')
    if (!setup) return
    document.querySelector('.landing-page')?.classList.add('landing-page--setup')

    // AppGate scrolls inside `.scroll-panel`, not the window.
    const panel = setup.closest('.scroll-panel')
    const behavior: ScrollBehavior = motion.reduced() ? 'auto' : 'smooth'

    const focusSetup = () => {
      // Prefer the first interactive control; heading stays in the scroll target.
      currencyTriggerRef.current?.focus({ preventScroll: true })
    }

    if (panel instanceof HTMLElement) {
      const stickyOffset = 56
      const top =
        setup.getBoundingClientRect().top -
        panel.getBoundingClientRect().top +
        panel.scrollTop -
        stickyOffset
      const target = Math.max(0, top)
      // Some Chromium embeds ignore behavior:'smooth' on overflow panels.
      panel.scrollTo({ top: target, behavior })
      window.setTimeout(() => {
        if (Math.abs(panel.scrollTop - target) > 16) {
          panel.scrollTo({ top: target, behavior: 'auto' })
        }
        focusSetup()
      }, behavior === 'smooth' ? 80 : 0)
    } else {
      setup.scrollIntoView({ behavior, block: 'start' })
      window.setTimeout(focusSetup, behavior === 'smooth' ? 80 : 0)
    }
  }

  return (
    <div className="landing-page relative">
      <header className="landing-topbar">
        <span className="brand-wordmark text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        <ModeToggle />
      </header>

      <section className="landing-hero" aria-labelledby="landing-brand">
        <div className="landing-hero-atmosphere" aria-hidden />
        <div className="landing-hero-grain" aria-hidden />
        <div className="landing-hero-stage">
          <div className="landing-hero-copy">
            <p
              id="landing-brand"
              className="brand-wordmark landing-brand-hero text-foreground"
            >
              {APP_NAME}
            </p>
            <h1 className="landing-headline text-pretty text-foreground">
              {APP_TAGLINE}
            </h1>
            <p className="landing-lede text-pretty text-muted-foreground">
              {APP_DESCRIPTION}
            </p>
            <div className="landing-cta-block">
              <Button
                size="lg"
                className="landing-cta min-h-11 w-full max-w-xs sm:w-auto"
                onClick={goToSetup}
              >
                Set up this device
              </Button>
              <p className="landing-scroll-cue">Takes about a minute</p>
            </div>
          </div>
          <div className="landing-hero-mock">
            <LandingProductMock />
          </div>
        </div>
      </section>

      <section
        id="setup"
        className="landing-setup"
        aria-labelledby="setup-heading"
      >
        <div className="landing-setup-inner">
          <div className="landing-setup-copy">
            <h2
              id="setup-heading"
              ref={setupHeadingRef}
              tabIndex={-1}
              className="brand-wordmark text-pretty text-2xl font-semibold tracking-tight text-foreground outline-none md:text-3xl"
            >
              Set up this device
            </h2>
            <p className="text-pretty text-sm text-muted-foreground md:text-[0.95rem]">
              Two choices, then your ledger is ready — everything stays on this
              device.
            </p>
            <LocalDataCallout />
          </div>

          <FieldGroup className="landing-setup-fields landing-mock-chrome gap-5 p-5 md:p-6">
            <Field>
              <FieldLabel htmlFor="onboarding-currency">Currency</FieldLabel>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger
                  id="onboarding-currency"
                  ref={currencyTriggerRef}
                  className="min-h-11 w-full"
                >
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(isCurrencyCode(currency)
                      ? CURRENCIES
                      : [currency, ...CURRENCIES]
                    ).map((code) => (
                      <SelectItem key={code} value={code}>
                        {currencyLabel(code)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="onboarding-budget">
                Default monthly budget ({currency})
              </FieldLabel>
              <Input
                id="onboarding-budget"
                name="budget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoComplete="off"
                className="min-h-11 scroll-mt-28"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </Field>

            <FieldSet className="gap-2">
              <FieldLegend variant="label">Starting data</FieldLegend>
              <div className="grid gap-2">
                {(
                  [
                    {
                      id: 'empty' as const,
                      title: 'Start empty',
                      description:
                        'Categories and accounts only—add your own entries.',
                    },
                    {
                      id: 'sample' as const,
                      title: 'Load sample data',
                      description:
                        'Fake demo transactions and bills you can delete anytime.',
                    },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMode(option.id)}
                    className={cn(
                      'pressable min-h-11 rounded-lg border px-4 py-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                      mode === option.id
                        ? 'border-ring/60 bg-secondary ring-2 ring-ring/30'
                        : 'hover:bg-muted',
                    )}
                    aria-pressed={mode === option.id}
                  >
                    <p className="text-sm font-medium">{option.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </FieldSet>

            {mutation.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {mutation.error.message}
              </p>
            ) : null}
          </FieldGroup>

          <div className="landing-setup-actions">
            <Button
              size="lg"
              className="min-h-11 w-full"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Setting up…' : 'Continue'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
