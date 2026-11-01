import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NAV_PATHS } from '#/lib/app-config'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultViewTransition: {
      types: ({
        fromLocation,
        toLocation,
        pathChanged,
      }: {
        fromLocation?: { pathname?: string; state?: { __TSR_index?: number } }
        toLocation: { pathname: string; state?: { __TSR_index?: number } }
        pathChanged: boolean
      }): string[] | false => {
        if (!pathChanged) return false
        if (typeof document === 'undefined') return false
        if (document.startViewTransition === undefined) return false
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
        const root = document.documentElement
        const clear = () => {
          root.style.removeProperty('--route-vt-out')
          root.style.removeProperty('--route-vt-in')
        }
        const setDir = (back: boolean) => {
          root.style.setProperty('--route-vt-out', back ? 'route-out-right' : 'route-out-left')
          root.style.setProperty('--route-vt-in', back ? 'route-in-left' : 'route-in-right')
          window.setTimeout(clear, 400)
        }
        const fromIdx = fromLocation?.state?.__TSR_index
        const toIdx = toLocation.state?.__TSR_index
        if (fromIdx !== undefined && toIdx !== undefined && toIdx < fromIdx) {
          setDir(true)
          return ['nav-back']
        }
        const fromNav = NAV_PATHS.indexOf(fromLocation?.pathname as (typeof NAV_PATHS)[number] ?? '')
        const toNav = NAV_PATHS.indexOf(toLocation.pathname as (typeof NAV_PATHS)[number])
        if (fromNav !== -1 && toNav !== -1 && fromNav !== toNav) {
          setDir(toNav < fromNav)
          return [toNav > fromNav ? 'nav-forward' : 'nav-back']
        }
        setDir(false)
        return ['nav-forward']
      },
    },
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
