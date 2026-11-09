import { Button } from '#/components/ui/button'
import { LandingPage } from '#/components/landing/landing-page'
import {
  APP_SETUP_URL,
  APP_URL,
  SITE_MODE,
  marketingHomeHref,
} from '#/lib/brand'

export function NotFoundPage() {
  return (
    <LandingPage
      title="Page not found"
      description="That URL isn't here. Open the app to use Pocketbook."
    >
      <div className="flex flex-wrap gap-2">
        {SITE_MODE === 'marketing' ? (
          <Button asChild size="sm" className="min-h-11">
            <a href={APP_SETUP_URL} rel="noopener">
              Get started
            </a>
          </Button>
        ) : null}
        <Button
          asChild
          size="sm"
          variant={SITE_MODE === 'marketing' ? 'outline' : 'default'}
          className="min-h-11"
        >
          <a href={marketingHomeHref()}>Home</a>
        </Button>
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <a href={APP_URL} rel="noopener">
            Open app
          </a>
        </Button>
      </div>
    </LandingPage>
  )
}
