import {
  useMutation,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import {
  invalidateAfter,
  type InvalidateScope,
} from '#/lib/query/invalidation'

type MutateContext<TData> = {
  previous?: TData
  [key: string]: unknown
}

export function useOptimisticMutation<TData, TVars, TResult = unknown>({
  queryClient,
  mutationFn,
  queryKey,
  invalidateKeys,
  onMutate,
  onSuccess,
  onError,
}: {
  queryClient: QueryClient
  mutationFn: (vars: TVars) => Promise<TResult>
  queryKey: QueryKey
  invalidateKeys: InvalidateScope[]
  onMutate?: (
    vars: TVars,
  ) => Promise<MutateContext<TData> | void> | MutateContext<TData> | void
  onSuccess?: (
    result: TResult,
    vars: TVars,
    context: MutateContext<TData> | undefined,
  ) => void
  onError?: (
    error: Error,
    vars: TVars,
    context: MutateContext<TData> | undefined,
  ) => void
}) {
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TData>(queryKey)
      const extra = (await onMutate?.(vars)) ?? {}
      return { previous, ...extra }
    },
    onSuccess: (result, vars, context) => {
      onSuccess?.(result, vars, context)
    },
    onError: (error, vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      onError?.(error as Error, vars, context)
    },
    onSettled: () => {
      void invalidateAfter(queryClient, invalidateKeys)
    },
  })
}
