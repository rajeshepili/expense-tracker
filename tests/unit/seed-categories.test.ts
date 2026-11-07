import { describe, expect, it } from 'vitest'
import { expenseCategories } from '#/data/sample-ledger'
import { COMMON_EXPENSE_CATEGORIES } from '#/data/seed'

describe('onboarding category presets', () => {
  it('Select common is a subset of expense presets', () => {
    const allowed = new Set<string>(expenseCategories)
    for (const name of COMMON_EXPENSE_CATEGORIES) {
      expect(allowed.has(name)).toBe(true)
    }
    expect([...COMMON_EXPENSE_CATEGORIES]).toEqual([
      'Food',
      'Housing',
      'Transport',
      'Other',
    ])
  })
})
