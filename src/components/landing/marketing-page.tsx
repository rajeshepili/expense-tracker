import type { ReactNode } from 'react'
import { ModeToggle } from '#/app/mode-toggle'
import { Button } from '#/components/ui/button'
import {
  APP_NAME,
  APP_SETUP_URL,
  APP_URL,
  MARKETING_URL,
  SITE_MODE,
} from '#/lib/brand'
import { cn } from 'cn'

type MarketingPageProps = {
  title: string
  description: string
  eyebrow?: string
  cta?: { label: string; href: string }
  children: ReactNode
  className?: string
}

const NAV_LINKS = [
  { href: '/', label: 'Home', exact: true },
  { href: '/features', label: 'Features', exact: false },
  { href: '/privacy', label: 'Privacy', exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

/** Absolute marketing URL when the app tree links out to the marketing host. */
function marketingHref(path: string) {
  if (SITE_MODE === 'marketing') return path
  if (path === '/') return MARKETING_URL
  return `${MARKETING_URL}${path}`
}

export function MarketingTopbar({ cta }: { cta?: { label: string; href: string } }) {
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/'
  return (
    <header className="landing-topbar mkt-topbar">
      <a
        href={marketingHref('/')}
        className="brand-wordmark text-sm font-semibold tracking-tight text-foreground no-underline"
      >
        {APP_NAME}
      </a>
      <nav className="mkt-nav" aria-label="Marketing">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={marketingHref(link.href)}
            className={cn(
              'mkt-nav-link',
              isActive(pathname, link.href, link.exact) && 'mkt-nav-link--active',
            )}
            aria-current={
              isActive(pathname, link.href, link.exact) ? 'page' : undefined
            }
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <ModeToggle />
        {cta ? (
          <Button asChild size="sm" className="mkt-cta min-h-11 md:min-h-9">
            <a href={cta.href} rel="noopener">
              {cta.label}
            </a>
          </Button>
        ) : null}
      </div>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <span className="brand-wordmark text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        <nav className="mkt-footer-nav" aria-label="Footer">
          <a href={marketingHref('/')} className="mkt-footer-link">
            Home
          </a>
          <a href={marketingHref('/features')} className="mkt-footer-link">
            Features
          </a>
          <a href={marketingHref('/privacy')} className="mkt-footer-link">
            Privacy
          </a>
          <a href={APP_URL} rel="noopener" className="mkt-footer-link">
            Open app
          </a>
        </nav>
        <p className="mkt-footer-note">
          Data stays in this browser — the marketing site stores nothing.
        </p>
      </div>
    </footer>
  )
}

/**
 * Shared chrome for marketing pages: topbar + hero + content + footer.
 * One continuous page backdrop, same type scale and radius as the landing.
 */
export function MarketingPage({
  title,
  description,
  eyebrow,
  cta,
  children,
  className,
}: MarketingPageProps) {
  const showAppCta =
    SITE_MODE === 'marketing'
      ? { label: 'Get started', href: APP_SETUP_URL }
      : cta
  return (
    <div className="landing-page mkt-page">
      <MarketingTopbar cta={showAppCta ?? cta} />
      <main className={cn('mkt-main', className)}>
        <section className="mkt-hero" aria-labelledby="mkt-title">
          {eyebrow ? <p className="mkt-eyebrow">{eyebrow}</p> : null}
          <h1 id="mkt-title" className="mkt-title text-pretty text-foreground">
            {title}
          </h1>
          <p className="mkt-lede text-pretty text-muted-foreground">
            {description}
          </p>
        </section>
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
