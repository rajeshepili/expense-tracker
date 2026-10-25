import { beforeEach, describe, expect, it } from 'vitest'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'

const STORAGE_KEY = 'expense-tracker-tx-defaults'

describe('transaction defaults', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value)
          },
          removeItem: (key: string) => {
            store.delete(key)
          },
        },
      },
    })
  })

  it('returns expense defaults when empty', () => {
    expect(readTransactionDefaults()).toEqual({
      type: 'expense',
      categoryIdByType: {},
      paymentMethodId: '',
    })
  })

  it('remembers type, category, and payment method', () => {
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
      categoryIdByType: {
        expense: 'food',
        income: 'salary',
      },
      paymentMethodId: 'bank',
    })
  })

  it('recovers from invalid stored JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(readTransactionDefaults()).toEqual({
      type: 'expense',
      categoryIdByType: {},
      paymentMethodId: '',
    })
  })
})
