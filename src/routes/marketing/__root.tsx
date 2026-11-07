import { lazy, useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { ThemeProvider } from '#/app/theme-provider'
import { Toaster } from '#/components/ui/sonner'

import appCss from '../../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  APP_URL,
  SITE_MODE,
} from '#/lib/brand'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'description',
        content: APP_DESCRIPTION,
      },
      { title: APP_NAME },
      {
        name: 'theme-color',
        content: '#f4f6f8',
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: '#1c2330',
        media: '(prefers-color-scheme: dark)',
      },
      { name: 'apple-mobile-web-app-title', content: APP_SHORT_NAME },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: APP_URL },
      {
        rel: 'icon',
        href: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/icons/apple-touch-icon.png',
        sizes: '180x180',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: () => <NotFoundPage />,
})

const NotFoundPage = lazy(() =>
  import('#/components/landing/not-found-page').then((m) => ({
    default: m.NotFoundPage,
  })),
)

/** Marketing layout (scrollable; no app gate/DB). */
function MarketingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('mkt-page-scroll')
    return () => document.body.classList.remove('mkt-page-scroll')
  }, [])
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="min-h-dvh">
        {children}
      </main>
    </>
  )
}

function RootComponent() {
  const matchedIds = useRouterState({
    select: (s) => s.matches.map((m) => m.routeId),
  })
  if (matchedIds.length <= 1) {
    return (
      <MarketingShell>
        <NotFoundPage />
      </MarketingShell>
    )
  }
  return (
    <MarketingShell>
      <Outlet />
    </MarketingShell>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-site-mode={SITE_MODE}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider defaultTheme="system" storageKey="expense-tracker-theme">
          {children}
          <Toaster
            position="bottom-center"
            richColors
            closeButton
            offset={16}
          />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
