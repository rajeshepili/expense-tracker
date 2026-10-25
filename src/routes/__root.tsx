import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { AppGate } from '#/app/app-gate'
import { AppNav } from '#/app/app-nav'
import { ThemeProvider } from '#/app/theme-provider'
import '#/db/index'

import appCss from '../styles.css?url'
import sqliteWasmUrl from '@sqlite.org/sqlite-wasm/sqlite3.wasm?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Expense Tracker' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // Start the ~840KB SQLite WASM download in parallel with JS (COEP needs CORS).
      {
        rel: 'preload',
        href: sqliteWasmUrl,
        as: 'fetch',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppGate>
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
          <AppNav />
          <main id="main" className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
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
