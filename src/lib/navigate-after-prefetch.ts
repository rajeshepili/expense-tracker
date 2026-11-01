import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter, NavigateOptions } from '@tanstack/react-router'
import { motion } from '#/lib/motion'
import { prefetchRouteAsync } from '#/lib/query/prefetch'

type NavigateAfterPrefetchOptions = NavigateOptions & {
  /** `false` suppresses the router's default view transition. */
  animate?: boolean
  /** Ledger deep-links pass the target month so the right list is warmed. */
  month?: string
}

export async function navigateAfterPrefetch(
  router: AnyRouter,
  queryClient: QueryClient,
  opts: NavigateAfterPrefetchOptions,
): Promise<void> {
  const { animate, month, to, ...rest } = opts
  const toPath = typeof to === 'string' ? to : '/'
  try {
    await prefetchRouteAsync(queryClient, toPath, { month })
  } catch {
    // Prefetch failure must not block navigation.
  }
  const doNavigate = () =>
    router.navigate({
      ...rest,
      to,
      viewTransition: animate === false ? false : undefined,
    } as NavigateOptions)
  if (animate === false || motion.reduced()) {
    await doNavigate()
    return
  }
  await motion.coalesceNavigate(toPath, async () => {
    await doNavigate()
    queueMicrotask(() => motion.trackPage())
  })
}
