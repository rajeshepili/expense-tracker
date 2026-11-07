import { describe, expect, it } from 'vitest'
import { transactionsToCsv } from '#/lib/export-csv'
import type { LedgerTransaction } from '#/lib/types'

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: 't1',
    description: 'Coffee',
    category: 'Food',
    categoryId: 'c1',
    paymentMethod: 'Cash',
    paymentMethodId: 'a1',
    accountId: 'a1',
    account: 'Cash',
    sourceRecurringId: null,
    transferId: null,
    transferDirection: null,
    date: '2026-11-04',
    amount: 6.75,
    type: 'expense',
    ...overrides,
  }
}

describe('transactionsToCsv', () => {
  it('emits a header row and one line per transaction', () => {
    const csv = transactionsToCsv([
      tx({}),
      tx({ id: 't2', description: 'Rent', amount: 1200 }),
    ])
    const lines = csv.trimEnd().split('\n')
    expect(lines[0]).toBe('date,type,description,category,account,amount')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('2026-11-04,expense,Coffee,Food,Cash,6.75')
  })

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = transactionsToCsv([
      tx({ description: 'Milk, eggs, "bread"\nand butter' }),
    ])
    expect(csv).toContain('"Milk, eggs, ""bread""\nand butter"')
  })

  it('handles empty input', () => {
    expect(transactionsToCsv([])).toBe(
      'date,type,description,category,account,amount\n',
    )
  })

  it('uses null-safe fallbacks for missing category/account', () => {
    const csv = transactionsToCsv([
      tx({ category: null, account: null, paymentMethod: null }),
    ])
    expect(csv.trimEnd().split('\n')[1]).toBe(
      '2026-11-04,expense,Coffee,,,6.75',
    )
  })
})
