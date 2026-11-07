import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter, NavigateOptions } from '@tanstack/react-router'
import {
  applyRouteVtDirection,
  clearRouteVtDirection,
  motion,
  resolveNavDirection,
} from '#/lib/motion'
import { prefetchRouteAsync } from '#/lib/query/prefetch'

type NavigateAfterPrefetchOptions = NavigateOptions & {
  animate?: boolean
  month?: string
}

/** Tab navigate with route view transition + prefetch. */
export async function navigateAfterPrefetch(
  router: AnyRouter,
  queryClient: QueryClient,
  opts: NavigateAfterPrefetchOptions,
): Promise<void> {
  const { animate, month, to, ...rest } = opts
  const toPath = typeof to === 'string' ? to : '/'
  const fromPath = router.state.location.pathname
  const pathChanged = fromPath !== toPath
  try {
    await prefetchRouteAsync(queryClient, toPath, { month })
  } catch {
    // ignore prefetch errors
  }

  const navigateNoVt = () =>
    router.navigate({
      ...rest,
      to,
      viewTransition: false,
    } as NavigateOptions)

  if (animate === false || motion.reduced() || !pathChanged) {
    await navigateNoVt()
    return
  }

  const { back } = resolveNavDirection({
    fromPathname: fromPath,
    toPathname: toPath,
  })
  applyRouteVtDirection(back)

  await motion.coalesceNavigate(toPath, async () => {
    const start = document.startViewTransition?.bind(document)
    if (typeof start !== 'function') {
      await navigateNoVt()
      clearRouteVtDirection()
      return
    }

    const vt = start(() => navigateNoVt())
    motion.trackPage(vt)
    try {
      await vt.updateCallbackDone
    } catch {
      // trackPage / safety timer still settle.
    }
  })
}
