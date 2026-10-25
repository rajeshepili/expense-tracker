import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'

export type InvalidateScope =
  | 'transactions'
  | 'recurring'
  | 'categories'
  | 'settings'
  | 'paymentMethods'
  | 'overview'

export async function invalidateAfter(
  queryClient: QueryClient,
  scopes: InvalidateScope[],
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentMethodsUsage,
      }),
    )
  }
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
