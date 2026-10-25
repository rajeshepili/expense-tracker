import { describe, expect, it } from 'vitest'
import {
  advanceRecurringDate,
  categoryBudgetBreakdown,
  compareIsoDate,
  amountDue,
  canOneTapRecord,
  currentYearMonth,
  defaultDateForMonth,
  defaultRecordDate,
  dueStatus,
  settleRecurringPayment,
  formatIsoDate,
  formatYearMonth,
  isCurrencyCode,
  isYearMonth,
  money,
  monthBudgetMatchesDefault,
  monthlyEquivalent,
  priorDeltaRatio,
  resolveMonthBudget,
  shiftYearMonth,
  summarizeTransactions,
} from '#/lib/finance'

describe('money', () => {
  it('formats with the currency symbol and rejects unknown codes', () => {
    expect(money(12.5, 'USD')).toBe('$12.50')
    expect(isCurrencyCode('EUR')).toBe(true)
    expect(isCurrencyCode('XYZ')).toBe(false)
  })
})

describe('dates and months', () => {
  it('formats and validates calendar keys', () => {
    expect(formatIsoDate('2026-10-24')).toBe('Oct 24')
    expect(formatIsoDate('2026-10-24', true)).toMatch(/2026/)
    expect(currentYearMonth(new Date('2026-10-25T12:00:00.000Z'))).toBe(
      '2026-10',
    )
    expect(formatYearMonth('2026-10')).toBe('October 2026')
    expect(formatYearMonth('bad')).toBe('bad')
    expect(isYearMonth('2026-10')).toBe(true)
    expect(isYearMonth('2026-13')).toBe(false)
    expect(shiftYearMonth('2026-10', -1)).toBe('2026-09')
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01')
  })

  it('ranks due status and picks a record date', () => {
    expect(compareIsoDate('2026-10-01', '2026-10-02')).toBe(-1)
    expect(dueStatus('2026-10-24', '2026-10-25')).toBe('overdue')
    expect(dueStatus('2026-10-25', '2026-10-25')).toBe('due')
    expect(dueStatus('2026-10-26', '2026-10-25')).toBe('upcoming')
    expect(canOneTapRecord('2026-10-24', '2026-10-25')).toBe(true)
    expect(canOneTapRecord('2026-10-25', '2026-10-25')).toBe(true)
    expect(canOneTapRecord('2026-10-26', '2026-10-25')).toBe(false)
    // Overdue/due → today; upcoming → nextDate
    expect(defaultRecordDate('2026-10-20', '2026-10-25')).toBe('2026-10-25')
    expect(defaultRecordDate('2026-10-28', '2026-10-25')).toBe('2026-10-28')
    // Ledger add while viewing a month
    expect(defaultDateForMonth('2026-10', '2026-10-25')).toBe('2026-10-25')
    expect(defaultDateForMonth('2026-09', '2026-10-25')).toBe('2026-09-30')
    expect(defaultDateForMonth('all', '2026-10-25')).toBe('2026-10-25')
  })

  it('advances recurring dates, including month-end and leap-day edges', () => {
    expect(advanceRecurringDate('2026-10-25', 'weekly')).toBe('2026-11-01')
    expect(advanceRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(advanceRecurringDate('2024-02-29', 'yearly')).toBe('2025-03-01')
  })

  it('computes prior-month deltas without dividing by zero', () => {
    expect(priorDeltaRatio(110, 100)).toBeCloseTo(0.1)
    expect(priorDeltaRatio(0, 0)).toBe(0)
    expect(priorDeltaRatio(50, 0)).toBeNull()
  })

  it('tracks amount due and partial vs settled payments', () => {
    expect(amountDue({ amount: 15, remainingAmount: null })).toBe(15)
    expect(amountDue({ amount: 15, remainingAmount: 5 })).toBe(5)
    expect(settleRecurringPayment(15, 10)).toEqual({
      kind: 'partial',
      remaining: 5,
    })
    expect(settleRecurringPayment(15, 15)).toEqual({ kind: 'settled' })
    expect(settleRecurringPayment(15, 20)).toEqual({ kind: 'settled' })
    expect(settleRecurringPayment(10.1, 10)).toEqual({
      kind: 'partial',
      remaining: 0.1,
    })
  })
})

describe('month budget', () => {
  it('treats an explicit override as custom even when it equals the default', () => {
    expect(resolveMonthBudget('2026-10', 2500, undefined)).toEqual({
      yearMonth: '2026-10',
      budget: 2500,
      defaultBudget: 2500,
      isCustom: false,
    })
    expect(resolveMonthBudget('2026-10', 2500, 2500)).toMatchObject({
      budget: 2500,
      isCustom: true,
    })
    expect(resolveMonthBudget('2026-11', 2500, 3000)).toMatchObject({
      budget: 3000,
      isCustom: true,
    })
    expect(monthBudgetMatchesDefault(2500, 2500)).toBe(true)
    expect(monthBudgetMatchesDefault(2800, 2500)).toBe(false)
  })
})

describe('transaction math', () => {
  it('summarizes income vs expenses and monthly cadence equivalents', () => {
    expect(
      summarizeTransactions([
        { type: 'income', amount: 100 },
        { type: 'expense', amount: 40 },
        { type: 'expense', amount: 10 },
      ]),
    ).toEqual({ income: 100, expenses: 50 })
    expect(monthlyEquivalent(100, 'monthly')).toBe(100)
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100)
    expect(monthlyEquivalent(100, 'weekly')).toBeCloseTo(100 * (52 / 12))
  })

  it('ranks category spend against budget and tolerates a zero budget', () => {
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
    expect(rows[1]).toMatchObject({ name: 'Food', amount: 50, ofSpend: 0.25 })

    const zeroBudget = categoryBudgetBreakdown(
      [{ category: 'Food', amount: 20 }],
      0,
    )
    expect(zeroBudget[0]).toMatchObject({ ofBudget: 0, ofSpend: 1 })
  })
})
