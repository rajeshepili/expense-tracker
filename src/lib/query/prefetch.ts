import type { QueryClient } from '@tanstack/react-query'
import { currentYearMonth } from '#/lib/finance'
import { queryKeys } from './keys'

async function repo() {
  return import('#/data/repository')
}

export type PrefetchRouteOptions = {
  /** Ledger deep-links can target a specific month (e.g. edit-from-overview). */
  month?: string
}

/**
 * Builds the awaitable query promises for a destination route. Shared by
 * `prefetchRoute` (fire-and-forget hover/intent) and `prefetchRouteAsync`
 * (click-time correctness layer before a view transition).
 */
async function routeQueryPromises(
  queryClient: QueryClient,
  to: string,
  opts: PrefetchRouteOptions = {},
): Promise<Promise<unknown>[]> {
  const { getOverview, getSettings, getMonthBudget, listCategories, listPaymentMethods, listRecurring, listSavingsGoals, listTransactions, listCategoriesWithUsage, listPaymentMethodsWithUsage } =
    await repo()

  if (to === '/') {
    const yearMonth = opts.month ?? currentYearMonth()
    return [
      queryClient
        .query({
          queryKey: queryKeys.overviewMonth(yearMonth),
          queryFn: () => getOverview(yearMonth),
        })
        .then(() => {
          const overview = queryClient.getQueryData<{ settings: unknown }>(
            queryKeys.overviewMonth(yearMonth),
          )
          if (overview?.settings) {
            queryClient.setQueryData(queryKeys.settings, overview.settings)
          }
        }),
    ]
  }

  if (to === '/ledger') {
    const filters = { month: opts.month ?? currentYearMonth() }
    return [
      queryClient.query({
        queryKey: queryKeys.transactionsList(filters),
        queryFn: () => listTransactions(filters),
      }),
      queryClient.query({ queryKey: queryKeys.settings, queryFn: getSettings }),
      queryClient.query({ queryKey: queryKeys.categories, queryFn: listCategories }),
      queryClient.query({
        queryKey: queryKeys.paymentMethods,
        queryFn: listPaymentMethods,
      }),
    ]
  }

  if (to === '/recurring') {
    return [
      queryClient.query({ queryKey: queryKeys.recurring, queryFn: listRecurring }),
      queryClient.query({ queryKey: queryKeys.settings, queryFn: getSettings }),
      queryClient.query({
        queryKey: [...queryKeys.settings, 'month-budget'] as const,
        queryFn: () => getMonthBudget(),
      }),
      queryClient.query({ queryKey: queryKeys.categories, queryFn: listCategories }),
      queryClient.query({
        queryKey: queryKeys.paymentMethods,
        queryFn: listPaymentMethods,
      }),
    ]
  }

  if (to === '/categories') {
    return [
      queryClient.query({
        queryKey: queryKeys.categoriesUsage,
        queryFn: listCategoriesWithUsage,
      }),
      queryClient.query({
        queryKey: queryKeys.paymentMethodsUsage,
        queryFn: listPaymentMethodsWithUsage,
      }),
    ]
  }

  if (to === '/savings') {
    return [
      queryClient.query({
        queryKey: queryKeys.savingsGoals,
        queryFn: listSavingsGoals,
      }),
      queryClient.query({ queryKey: queryKeys.settings, queryFn: getSettings }),
      queryClient.query({ queryKey: queryKeys.categories, queryFn: listCategories }),
    ]
  }

  return []
}

/** Fire-and-forget prefetch for hover/focus intent. */
export function prefetchRoute(queryClient: QueryClient, to: string, opts?: PrefetchRouteOptions) {
  void routeQueryPromises(queryClient, to, opts)
}

/**
 * Awaitable prefetch used right before a navigation. Awaiting it while the
 * page is still interactive (before the router's view transition starts)
 * guarantees the target route's queries are cached, so the VT snapshots
 * contentful UI instead of a skeleton.
 */
export async function prefetchRouteAsync(
  queryClient: QueryClient,
  to: string,
  opts?: PrefetchRouteOptions,
): Promise<void> {
  const promises = await routeQueryPromises(queryClient, to, opts)
  await Promise.all(promises)
}
