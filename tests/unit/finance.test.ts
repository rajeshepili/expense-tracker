import { describe, expect, it } from 'vitest'
import {
  amountToneClass,
  categoryBudgetBreakdown,
  currentYearMonth,
  formatIsoDate,
  formatYearMonth,
  isCurrencyCode,
  money,
  monthBudgetMatchesDefault,
  monthlyEquivalent,
  percent,
  resolveMonthBudget,
  signedAmountPrefix,
  summarizeTransactions,
} from '#/lib/finance'

describe('money and currency', () => {
  it('formats USD amounts', () => {
    expect(money(12.5, 'USD')).toBe('$12.50')
  })

  it('accepts known currency codes only', () => {
    expect(isCurrencyCode('EUR')).toBe(true)
    expect(isCurrencyCode('XYZ')).toBe(false)
  })
})

describe('dates and months', () => {
  it('formats ISO dates', () => {
    expect(formatIsoDate('2026-10-24')).toBe('Oct 24')
    expect(formatIsoDate('2026-10-24', true)).toMatch(/2026/)
  })

  it('builds the current year-month key', () => {
    expect(currentYearMonth(new Date('2026-10-25T12:00:00.000Z'))).toBe(
      '2026-10',
    )
  })

  it('formats year-month labels', () => {
    expect(formatYearMonth('2026-10')).toBe('October 2026')
    expect(formatYearMonth('bad')).toBe('bad')
  })
})

describe('resolveMonthBudget', () => {
  it('uses the default when there is no override', () => {
    expect(resolveMonthBudget('2026-10', 2500, undefined)).toEqual({
      yearMonth: '2026-10',
      budget: 2500,
      defaultBudget: 2500,
      isCustom: false,
    })
  })

  it('keeps a custom override even when it equals the default numerically', () => {
    expect(resolveMonthBudget('2026-10', 2500, 2500)).toEqual({
      yearMonth: '2026-10',
      budget: 2500,
      defaultBudget: 2500,
      isCustom: true,
    })
  })

  it('uses a different month override', () => {
    expect(resolveMonthBudget('2026-11', 2500, 3000)).toEqual({
      yearMonth: '2026-11',
      budget: 3000,
      defaultBudget: 2500,
      isCustom: true,
    })
  })

  it('treats matching drafts as “use default” on save', () => {
    expect(monthBudgetMatchesDefault(2500, 2500)).toBe(true)
    expect(monthBudgetMatchesDefault(2800, 2500)).toBe(false)
  })
})

describe('transaction math', () => {
  it('summarizes income and expenses', () => {
    expect(
      summarizeTransactions([
        { type: 'income', amount: 100 },
        { type: 'expense', amount: 40 },
        { type: 'expense', amount: 10 },
      ]),
    ).toEqual({ income: 100, expenses: 50 })
  })

  it('converts cadences to a monthly equivalent', () => {
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
    expect(monthlyEquivalent(100, 'weekly')).toBeCloseTo(100 * (52 / 12))
  })

  it('breaks categories down against budget and spend', () => {
    const rows = categoryBudgetBreakdown(
      [
        { category: 'Food', amount: 40 },
        { category: 'Food', amount: 10 },
        { category: 'Rent', amount: 150 },
      ],
      200,
    )
    expect(rows[0]).toMatchObject({
      name: 'Rent',
      amount: 150,
      ofSpend: 0.75,
      ofBudget: 0.75,
    })
    expect(rows[1]).toMatchObject({
      name: 'Food',
      amount: 50,
      ofSpend: 0.25,
      ofBudget: 0.25,
    })
  })

  it('handles a zero budget without dividing by zero', () => {
    const rows = categoryBudgetBreakdown(
      [{ category: 'Food', amount: 20 }],
      0,
    )
    expect(rows[0]?.ofBudget).toBe(0)
    expect(rows[0]?.ofSpend).toBe(1)
  })
})

describe('display helpers', () => {
  it('maps type to tone and sign', () => {
    expect(amountToneClass('income')).toBe('text-income')
    expect(amountToneClass('expense')).toBe('text-expense')
    expect(signedAmountPrefix('income')).toBe('+')
    expect(signedAmountPrefix('expense')).toBe('−')
  })

  it('formats percents', () => {
    expect(percent(0.54)).toBe('54%')
  })
})
