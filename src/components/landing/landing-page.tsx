import type { ReactNode } from 'react'
import { ModeToggle } from '#/app/mode-toggle'
import { Button } from '#/components/ui/button'
import {
  APP_NAME,
  APP_URL,
  marketingHomeHref,
} from '#/lib/brand'
import { cn } from 'cn'

type LandingPageProps = {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function LandingTopbar() {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex min-h-12 items-center justify-between gap-4',
        'border-b border-border/70 bg-background/92 px-4 pt-[calc(0.4rem+var(--safe-top))] pb-2.5 backdrop-blur-[14px]',
        'md:min-h-11 md:px-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between">
        <a
          href={marketingHomeHref()}
          className="brand-wordmark px-1 text-[0.95rem] font-semibold tracking-tight text-foreground"
        >
          {APP_NAME}
        </a>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

export function LandingFooter() {
  return (
    <footer className="mt-auto px-4 py-6 pb-[calc(1.5rem+var(--safe-bottom))] md:px-8">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
        <span className="brand-wordmark text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Footer">
          <Button
            asChild
            variant="link"
            size="sm"
            className="h-auto px-0 text-foreground/80"
          >
            <a href={APP_URL} rel="noopener">
              Open app
            </a>
          </Button>
        </nav>
        <p className="m-0 text-xs leading-relaxed text-foreground/75 sm:w-full">
          Data stays in this browser.
        </p>
      </div>
    </footer>
  )
}

export function LandingPage({
  title,
  description,
  children,
  className,
}: LandingPageProps) {
  return (
    <div className="relative flex min-h-svh w-full flex-col bg-background">
      <LandingTopbar />
      <div
        className={cn(
          'mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:px-8 md:py-16',
          className,
        )}
      >
        <header
          className="mb-8 flex w-full flex-col items-start gap-3"
          aria-labelledby="landing-title"
        >
          <h1
            id="landing-title"
            className="m-0 text-[clamp(1.75rem,4.5vw,2.4rem)] font-semibold tracking-tight leading-[1.1] text-pretty text-foreground"
          >
            {title}
          </h1>
          <p className="m-0 max-w-[52ch] text-base leading-relaxed text-pretty text-foreground/85">
            {description}
          </p>
        </header>
        {children}
      </div>
      <LandingFooter />
    </div>
  )
}
