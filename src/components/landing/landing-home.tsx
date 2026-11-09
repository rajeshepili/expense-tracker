import { useEffect, useRef } from 'react'
import { LandingAtmosphere } from '#/components/landing/landing-atmosphere'
import {
  LandingFooter,
  LandingTopbar,
} from '#/components/landing/landing-page'
import { LandingProductMock } from '#/components/landing/product-mock'
import { Button } from '#/components/ui/button'
import { settleNow, slideKeyframes } from '#/lib/motion'
import {
  APP_NAME,
  APP_SETUP_URL,
  APP_TAGLINE,
  APP_URL,
  SITE_MODE,
} from '#/lib/brand'

export function LandingHome() {
  const copyRef = useRef<HTMLDivElement | null>(null)
  const proofRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const copy = copyRef.current
    const proof = proofRef.current
    const controls = [
      copy
        ? settleNow([...copy.children], slideKeyframes('up'), {
            staggerMs: 60,
          })
        : undefined,
      proof
        ? settleNow(proof, slideKeyframes('up'), { duration: 0.42 })
        : undefined,
    ]
    return () => {
      for (const c of controls) c?.stop()
    }
  }, [])

  return (
    <div className="relative flex min-h-svh w-full flex-col bg-background">
      <LandingAtmosphere />
      <div className="relative z-10 flex min-h-svh w-full flex-col">
        <LandingTopbar />

        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 pb-8 pt-6 md:grid md:grid-cols-12 md:items-center md:gap-12 md:px-8 md:py-14 lg:px-10">
          <div
            ref={copyRef}
            className="flex flex-col items-start gap-4 md:col-span-5 md:gap-5"
          >
            <p className="brand-wordmark m-0 text-[clamp(2.5rem,11vw,4rem)] leading-[0.98] tracking-tight text-foreground">
              {APP_NAME}
            </p>
            <h1 className="m-0 max-w-[18ch] text-[clamp(1.35rem,4.6vw,1.75rem)] font-semibold tracking-tight text-pretty text-foreground leading-snug">
              {APP_TAGLINE}
            </h1>
            <p className="m-0 max-w-[34ch] text-[0.95rem] font-medium leading-relaxed text-pretty text-foreground md:max-w-[38ch] md:text-base">
              Income, spend, and what&apos;s left this month. Stored only in
              this browser.
            </p>
            <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
              <Button
                asChild
                size="lg"
                className="pressable min-h-11 w-full sm:w-auto sm:min-w-40"
              >
                <a href={APP_SETUP_URL} rel="noopener">
                  Get started
                </a>
              </Button>
              {SITE_MODE === 'marketing' ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="pressable min-h-11 w-full border-border bg-background/80 text-foreground sm:w-auto"
                >
                  <a href={APP_URL} rel="noopener">
                    Open app
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div
            ref={proofRef}
            className="mt-8 w-full min-w-0 will-change-transform md:col-span-7 md:mt-0"
          >
            <LandingProductMock />
          </div>
        </div>

        <LandingFooter />
      </div>
    </div>
  )
}
