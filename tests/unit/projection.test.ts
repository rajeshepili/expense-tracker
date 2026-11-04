import { describe, expect, it } from 'vitest'
import { projectRestOfMonth } from '#/lib/finance/projection'
import type { RecurringProjectionRow } from '#/lib/finance/projection'

function row(overrides: Partial<RecurringProjectionRow>): RecurringProjectionRow {
  return {
    kind: 'expense',
    amount: 100,
    cadence: 'monthly',
    nextDate: '2026-11-15',
    active: true,
    ...overrides,
  }
}

describe('projectRestOfMonth', () => {
  it('sums a monthly bill due later this month', () => {
    const result = projectRestOfMonth([row({})], '2026-11-04')
    expect(result.upcomingExpenses).toBe(100)
    expect(result.upcomingIncome).toBe(0)
    expect(result.net).toBe(-100)
  })

  it('excludes occurrences due before the from date', () => {
    const result = projectRestOfMonth([row({ nextDate: '2026-11-01' })], '2026-11-04')
    expect(result.upcomingExpenses).toBe(0)
  })

  it('includes occurrences due exactly on the from date', () => {
    const result = projectRestOfMonth([row({ nextDate: '2026-11-04' })], '2026-11-04')
    expect(result.upcomingExpenses).toBe(100)
  })

  it('stops at the month boundary (monthly cadence)', () => {
    const result = projectRestOfMonth([row({ nextDate: '2026-11-30', amount: 50 })], '2026-11-01')
    expect(result.upcomingExpenses).toBe(50)
  })

  it('counts every weekly occurrence within the month', () => {
    const result = projectRestOfMonth([row({ cadence: 'weekly', amount: 10, nextDate: '2026-11-04' })], '2026-11-04')
    expect(result.upcomingExpenses).toBe(40)
  })

  it('skips inactive rows', () => {
    const result = projectRestOfMonth([row({ active: false })], '2026-11-04')
    expect(result.net).toBe(0)
  })

  it('separates income from expenses', () => {
    const result = projectRestOfMonth(
      [
        row({ kind: 'income', amount: 4200, nextDate: '2026-11-28' }),
        row({ amount: 1200, nextDate: '2026-11-01' }),
      ],
      '2026-11-04',
    )
    expect(result.upcomingIncome).toBe(4200)
    expect(result.upcomingExpenses).toBe(0)
    expect(result.net).toBe(4200)
  })

  it('yearly cadence counts only if due within the month', () => {
    const inMonth = projectRestOfMonth([row({ cadence: 'yearly', amount: 14, nextDate: '2026-11-20' })], '2026-11-04')
    expect(inMonth.upcomingExpenses).toBe(14)
    const outOfMonth = projectRestOfMonth([row({ cadence: 'yearly', amount: 14, nextDate: '2027-01-20' })], '2026-11-04')
    expect(outOfMonth.upcomingExpenses).toBe(0)
  })
})
