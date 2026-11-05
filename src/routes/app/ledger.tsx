import { createFileRoute } from '@tanstack/react-router'
import { LedgerScreen } from '#/features/ledger/ledger-screen'
import type { LedgerSearch } from '#/lib/types'
import { isYearMonth } from '#/lib/finance'

export const Route = createFileRoute('/ledger')({
  validateSearch: (search: Record<string, unknown>): LedgerSearch => {
    const monthRaw = typeof search.month === 'string' ? search.month : undefined
    const month =
      monthRaw === 'all' || (monthRaw && isYearMonth(monthRaw))
        ? monthRaw
        : undefined
    const typeRaw = typeof search.type === 'string' ? search.type : undefined
    const type =
      typeRaw === 'expense' || typeRaw === 'income' || typeRaw === 'transfer'
        ? typeRaw
        : undefined
    return {
      new: search.new === true || search.new === '1' || search.new === 1,
      edit: typeof search.edit === 'string' ? search.edit : undefined,
      month,
      category:
        typeof search.category === 'string' ? search.category : undefined,
      method: typeof search.method === 'string' ? search.method : undefined,
      type,
      q: typeof search.q === 'string' ? search.q : undefined,
    }
  },
  component: LedgerScreen,
})
