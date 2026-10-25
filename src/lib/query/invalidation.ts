import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'

/** Invalidate only the caches that a mutation actually changes. */
export async function invalidateAfter(
  queryClient: QueryClient,
  scopes: Array<
    | 'transactions'
    | 'recurring'
    | 'categories'
    | 'settings'
    | 'paymentMethods'
    | 'overview'
  >,
) {
  const tasks: Promise<unknown>[] = []
  const set = new Set(scopes)

  if (set.has('transactions')) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
    )
  }
  if (set.has('recurring')) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.recurring }))
  }
  if (set.has('categories')) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categoriesUsage }),
    )
  }
  if (set.has('settings')) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.settings }))
  }
  if (set.has('paymentMethods')) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods }),
    )
  }
  // Overview is derived from the above; invalidate when any input changes.
  if (
    set.has('overview') ||
    set.has('transactions') ||
    set.has('recurring') ||
    set.has('settings')
  ) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.overview }))
  }

  await Promise.all(tasks)
}
