import { Button } from '#/components/ui/button'
import { MarketingPage } from '#/components/landing/marketing-page'
import { APP_SETUP_URL, MARKETING_URL, SITE_MODE } from '#/lib/brand'

function href(path: string) {
  if (SITE_MODE === 'marketing') return path
  if (path === '/') return SITE_MODE === 'app' ? '/' : MARKETING_URL
  return SITE_MODE === 'app' ? `${MARKETING_URL}${path}` : path
}

export function NotFoundPage() {
  return (
    <MarketingPage
      eyebrow="404"
      title="This page moved or never existed"
      description="The ledger you're looking for lives in the app."
      cta={
        SITE_MODE === 'marketing'
          ? { label: 'Get started', href: APP_SETUP_URL }
          : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="min-h-11">
          <a href={SITE_MODE === 'app' ? '/' : href('/')}>Back to start</a>
        </Button>
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <a href={href('/features')}>Features</a>
        </Button>
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <a href={href('/privacy')}>Privacy</a>
        </Button>
      </div>
    </MarketingPage>
  )
}
