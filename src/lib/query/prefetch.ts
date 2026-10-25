import type { QueryClient } from '@tanstack/react-query'
import { currentYearMonth } from '#/lib/finance'
import { queryKeys } from './keys'

async function repo() {
  return import('#/data/repository')
}

export function prefetchRoute(queryClient: QueryClient, to: string) {
  if (to === '/') {
    void repo().then(({ getOverview }) => {
      const yearMonth = currentYearMonth()
      void queryClient
        .query({
          queryKey: queryKeys.overviewMonth(yearMonth),
          queryFn: () => getOverview(yearMonth),
        })
        .then(() => {
          const overview = queryClient.getQueryData<{
            settings: unknown
          }>(queryKeys.overviewMonth(yearMonth))
          if (overview?.settings) {
            queryClient.setQueryData(queryKeys.settings, overview.settings)
          }
        })
    })
    return
  }

  if (to === '/ledger') {
    void repo().then(
      ({
        listTransactions,
        getSettings,
        listCategories,
        listPaymentMethods,
      }) => {
        void queryClient.query({
          queryKey: queryKeys.transactions,
          queryFn: listTransactions,
        })
        void queryClient.query({
          queryKey: queryKeys.settings,
          queryFn: getSettings,
        })
        void queryClient.query({
          queryKey: queryKeys.categories,
          queryFn: listCategories,
        })
        void queryClient.query({
          queryKey: queryKeys.paymentMethods,
          queryFn: listPaymentMethods,
        })
      },
    )
    return
  }

  if (to === '/recurring') {
    void repo().then(
      ({ listRecurring, getSettings, listCategories, listPaymentMethods }) => {
        void queryClient.query({
          queryKey: queryKeys.recurring,
          queryFn: listRecurring,
        })
        void queryClient.query({
          queryKey: queryKeys.settings,
          queryFn: getSettings,
        })
        void queryClient.query({
          queryKey: queryKeys.categories,
          queryFn: listCategories,
        })
        void queryClient.query({
          queryKey: queryKeys.paymentMethods,
          queryFn: listPaymentMethods,
        })
      },
    )
    return
  }

  if (to === '/categories') {
    void repo().then(
      ({ listCategoriesWithUsage, listPaymentMethodsWithUsage }) => {
        void queryClient.query({
          queryKey: queryKeys.categoriesUsage,
          queryFn: listCategoriesWithUsage,
        })
        void queryClient.query({
          queryKey: queryKeys.paymentMethods,
          queryFn: listPaymentMethodsWithUsage,
        })
      },
    )
  }
}
