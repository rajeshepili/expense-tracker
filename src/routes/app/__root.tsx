import { lazy, useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { InstallNudge } from '#/features/shared/install-nudge'
import { AppTour } from '#/features/shared/app-tour'
import { AppGate } from '#/app/app-gate'
import { AppNav } from '#/app/app-nav'
import { ThemeProvider } from '#/app/theme-provider'
import { Toaster } from '#/components/ui/sonner'
import '#/db/index'

import appCss from '../../styles.css?url'
import font400Url from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url'

import type { QueryClient } from '@tanstack/react-query'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  SITE_MODE,
} from '#/lib/brand'

interface MyRouterContext {
  queryClient: QueryClient
}

function SWRegister() {
  useEffect(() => {
    if (import.meta.env.DEV) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}

/** Shrink OPFS WAL when the tab is hidden so storage cannot balloon. */
function WalMaintenance() {
  useEffect(() => {
    const run = () => {
      void import('#/db/index').then((m) => m.checkpointWal())
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') run()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', run)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', run)
    }
  }, [])
  return null
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
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: APP_SHORT_NAME },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'preload',
        href: font400Url,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'manifest', href: '/manifest.webmanifest' },
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

/** Prod builds must not reference this — prerender loads every SSR chunk. */
const DevtoolsLazy = import.meta.env.DEV
  ? lazy(async () => {
      const [
        { TanStackDevtools },
        { TanStackRouterDevtoolsPanel },
        queryDevtools,
      ] = await Promise.all([
        import('@tanstack/react-devtools'),
        import('@tanstack/react-router-devtools'),
        import('../../integrations/tanstack-query/devtools'),
      ])
      return {
        default: function Devtools() {
          return (
            <TanStackDevtools
              config={{ position: 'bottom-right' }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                queryDevtools.default,
              ]}
            />
          )
        },
      }
    })
  : null

function RootComponent() {
  return (
    <>
      <SWRegister />
      <WalMaintenance />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppGate>
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
          <AppNav />
          <main
            id="main"
            className="page-content min-h-0 flex-1 overflow-hidden pb-[var(--tab-bar-h)] md:pb-0"
          >
            <Outlet />
          </main>
        </div>
        <InstallNudge />
        <AppTour />
      </AppGate>
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-site-mode={SITE_MODE}>
      <head>
        <HeadContent />
      </head>
      <body className="h-dvh overflow-hidden antialiased">
        <ThemeProvider defaultTheme="system" storageKey="expense-tracker-theme">
          {children}
          <Toaster
            position="bottom-center"
            richColors
            closeButton
            offset={16}
            mobileOffset={{ bottom: 'calc(var(--tab-bar-h) + 0.75rem)' }}
          />
        </ThemeProvider>
        {DevtoolsLazy ? <DevtoolsLazy /> : null}
        <Scripts />
      </body>
    </html>
  )
}
