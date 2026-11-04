import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { InstallNudge } from '#/components/install-nudge'
import { AppTour } from '#/components/app-tour'
import { AppGate } from '#/app/app-gate'
import { AppNav } from '#/app/app-nav'
import { ThemeProvider } from '#/app/theme-provider'
import { Toaster } from '#/components/ui/sonner'
import '#/db/index'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from '#/lib/brand'

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
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
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
      // Do not preload sqlite3.wasm here: sqlocal fetches it inside a worker, so a
      // document-level link preload is unused and triggers a Chrome console warning.
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <>
      <SWRegister />
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
    <html lang="en" suppressHydrationWarning>
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
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
