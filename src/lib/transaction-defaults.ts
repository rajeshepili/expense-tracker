import type { TransactionType } from '#/lib/types'

const STORAGE_KEY = 'expense-tracker-tx-defaults'

export type TransactionDefaults = {
  type: TransactionType
  categoryIdByType: Partial<Record<TransactionType, string>>
  paymentMethodId: string
}

export function readTransactionDefaults(): TransactionDefaults {
  if (typeof window === 'undefined') {
    return { type: 'expense', categoryIdByType: {}, paymentMethodId: '' }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { type: 'expense', categoryIdByType: {}, paymentMethodId: '' }
    }
    const parsed = JSON.parse(raw) as Partial<TransactionDefaults>
    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      categoryIdByType: parsed.categoryIdByType ?? {},
      paymentMethodId: parsed.paymentMethodId ?? '',
    }
  } catch {
    return { type: 'expense', categoryIdByType: {}, paymentMethodId: '' }
  }
}

export function rememberTransactionDefaults(input: {
  type: TransactionType
  categoryId: string
  paymentMethodId: string
}) {
  if (typeof window === 'undefined') return
  const current = readTransactionDefaults()
  const next: TransactionDefaults = {
    type: input.type,
    categoryIdByType: {
      ...current.categoryIdByType,
      [input.type]: input.categoryId,
    },
    paymentMethodId: input.paymentMethodId,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
