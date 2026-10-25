import { beforeEach, describe, expect, it } from 'vitest'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'
import { installMemoryLocalStorage } from '../test-utils'

const STORAGE_KEY = 'expense-tracker-tx-defaults'

const emptyDefaults = {
  type: 'expense' as const,
  categoryIdByType: {},
  paymentMethodId: '',
}

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('transaction defaults', () => {
  it('starts empty and remembers the last type, category, and method', () => {
    expect(readTransactionDefaults()).toEqual(emptyDefaults)

    rememberTransactionDefaults({
      type: 'expense',
      categoryId: 'food',
      paymentMethodId: 'card',
    })
    rememberTransactionDefaults({
      type: 'income',
      categoryId: 'salary',
      paymentMethodId: 'bank',
    })

    expect(readTransactionDefaults()).toEqual({
      type: 'income',
      categoryIdByType: { expense: 'food', income: 'salary' },
      paymentMethodId: 'bank',
    })
  })

  it('falls back to empty defaults when stored JSON is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(readTransactionDefaults()).toEqual(emptyDefaults)
  })
})
