import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { applyRouteVtDirection, resolveNavDirection } from '#/lib/motion'

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
    // History / non-tab navigations. Tabs stamp + VT in navigateAfterPrefetch.
    // types callback is only used to stamp page-forward|page-back names (and PRM).
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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return false
        }
        const { back } = resolveNavDirection({
          fromPathname: fromLocation?.pathname,
          toPathname: toLocation.pathname,
          fromIndex: fromLocation?.state?.__TSR_index,
          toIndex: toLocation.state?.__TSR_index,
        })
        applyRouteVtDirection(back)
        return ['route']
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
