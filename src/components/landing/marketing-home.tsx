import { LandingProductMock } from '#/components/landing/product-mock'
import {
  MarketingFooter,
  MarketingTopbar,
} from '#/components/landing/marketing-page'
import { Button } from '#/components/ui/button'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SETUP_URL,
  APP_TAGLINE,
  APP_URL,
} from '#/lib/brand'

/** Marketing host landing — hero + CTA to the app. No setup, no DB. */
export function MarketingHome() {
  return (
    <div className="landing-page relative">
      <MarketingTopbar cta={{ label: 'Get started', href: APP_SETUP_URL }} />

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
                asChild
                size="lg"
                className="landing-cta min-h-11 w-full max-w-xs sm:w-auto"
              >
                <a href={APP_SETUP_URL} rel="noopener">
                  Get started
                </a>
              </Button>
              <p className="landing-scroll-cue text-pretty">
                <a
                  href={APP_URL}
                  rel="noopener"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Already using Pocketbook? Open app
                </a>
              </p>
            </div>
          </div>
          <div className="landing-hero-mock">
            <LandingProductMock />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
