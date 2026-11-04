import { describe, expect, it } from 'vitest'
import { findPossibleDuplicate } from '#/lib/duplicate'
import type { LedgerTransaction } from '#/lib/types'

function tx(overrides: Partial<LedgerTransaction>): LedgerTransaction {
  return {
    id: 't1',
    description: 'Netflix',
    category: 'Other',
    categoryId: 'c1',
    paymentMethod: null,
    paymentMethodId: null,
    accountId: null,
    account: null,
    sourceRecurringId: null,
    transferId: null,
    transferDirection: null,
    date: '2026-11-01',
    amount: 15.99,
    type: 'expense',
    ...overrides,
  }
}

const candidate = {
  description: 'netflix',
  amount: 15.99,
  date: '2026-11-04',
  type: 'expense' as const,
}

describe('findPossibleDuplicate', () => {
  it('matches same description + amount within 3 days, case/space-insensitive', () => {
    const rows = [tx({ description: '  Netflix  ' })]
    expect(findPossibleDuplicate(rows, candidate)?.id).toBe('t1')
  })

  it('ignores different amounts', () => {
    const rows = [tx({ amount: 9.99 })]
    expect(findPossibleDuplicate(rows, candidate)).toBeNull()
  })

  it('ignores different dates beyond the window', () => {
    const rows = [tx({ date: '2026-10-20' })]
    expect(findPossibleDuplicate(rows, candidate)).toBeNull()
  })

  it('ignores different types', () => {
    const rows = [tx({ type: 'income' })]
    expect(findPossibleDuplicate(rows, candidate)).toBeNull()
  })

  it('never matches transfers', () => {
    const rows = [tx({ type: 'transfer' })]
    expect(
      findPossibleDuplicate(rows, { ...candidate, type: 'transfer' }),
    ).toBeNull()
  })

  it('skips the excluded id (edit case)', () => {
    const rows = [tx({ id: 't1' })]
    expect(findPossibleDuplicate(rows, candidate, 't1')).toBeNull()
  })

  it('prefers the most recent match', () => {
    const rows = [tx({ id: 'old', date: '2026-11-02' }), tx({ id: 'new', date: '2026-11-03' })]
    expect(findPossibleDuplicate(rows, candidate)?.id).toBe('new')
  })
})
