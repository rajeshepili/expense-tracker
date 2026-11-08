import type { QueryClient } from '@tanstack/react-query'
import { scheduleCheckpointWal } from '#/db/index'
import { queryKeys } from './keys'

export type InvalidateScope =
  | 'transactions'
  | 'recurring'
  | 'categories'
  | 'settings'
  | 'accounts'
  | 'transfers'
  | 'savingsGoals'
  | 'overview'

export async function invalidateAfter(
  queryClient: QueryClient,
  scopes: InvalidateScope[],
) {
  const tasks: Promise<unknown>[] = []
  const set = new Set(scopes)

  if (set.has('transfers')) {
    set.add('accounts')
    set.add('transactions')
    set.add('overview')
  }

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
  if (set.has('accounts')) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsUsage }),
    )
  }
  if (set.has('savingsGoals')) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals }),
    )
  }

  const touchOverview =
    set.has('overview') ||
    set.has('recurring') ||
    set.has('settings') ||
    set.has('transfers') ||
    set.has('transactions') ||
    set.has('accounts')

  if (touchOverview) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.overview,
        refetchType: 'active',
      }),
    )
  }

  await Promise.all(tasks)

  if (
    set.has('transactions') ||
    set.has('transfers') ||
    set.has('accounts') ||
    set.has('recurring') ||
    set.has('savingsGoals')
  ) {
    scheduleCheckpointWal()
  }
}
