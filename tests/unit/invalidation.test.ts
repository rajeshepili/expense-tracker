import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'

vi.mock('#/db/index', () => ({
  scheduleCheckpointWal: vi.fn(),
}))

describe('invalidateAfter', () => {
  it('invalidates transaction queries and active overview after ledger writes', async () => {
    const queryClient = new QueryClient()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await invalidateAfter(queryClient, ['transactions', 'accounts'])

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey)
    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.transactions,
        queryKeys.accounts,
        queryKeys.overview,
      ]),
    )
    expect(keys).not.toContainEqual(queryKeys.categories)
    expect(keys).not.toContainEqual(queryKeys.categoriesUsage)

    const overviewCall = spy.mock.calls.find(
      (call) => call[0]?.queryKey === queryKeys.overview,
    )
    expect(overviewCall?.[0]?.refetchType).toBe('active')
  })

  it('does not touch overview for categories-only updates', async () => {
    const queryClient = new QueryClient()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await invalidateAfter(queryClient, ['categories'])

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey)
    expect(keys).toEqual(
      expect.arrayContaining([queryKeys.categories, queryKeys.categoriesUsage]),
    )
    expect(keys).not.toContainEqual(queryKeys.overview)
  })

  it('expands transfers into accounts + transactions + overview', async () => {
    const queryClient = new QueryClient()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    await invalidateAfter(queryClient, ['transfers'])

    const keys = spy.mock.calls.map((call) => call[0]?.queryKey)
    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.transactions,
        queryKeys.accounts,
        queryKeys.overview,
      ]),
    )
  })

  it('schedules a WAL checkpoint after write scopes', async () => {
    const { scheduleCheckpointWal } = await import('#/db/index')
    const queryClient = new QueryClient()

    await invalidateAfter(queryClient, ['transactions'])

    expect(scheduleCheckpointWal).toHaveBeenCalledOnce()
  })
})
