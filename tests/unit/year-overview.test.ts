import { describe, expect, it } from 'vitest'

// The SQL aggregation lives in getYearOverview; these tests pin the
// documented contract for filling a 12-month year from sparse rows.

type MonthlyRow = { yearMonth: string; income: number; expenses: number }

function fillYear(year: string, rows: MonthlyRow[]) {
  const byKey = new Map(rows.map((r) => [r.yearMonth, r]))
  return Array.from({ length: 12 }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, '0')}`
    const found = byKey.get(ym)
    return { yearMonth: ym, income: found?.income ?? 0, expenses: found?.expenses ?? 0 }
  })
}

describe('year overview month filling', () => {
  it('fills all 12 months, zeroing missing ones', () => {
    const months = fillYear('2026', [
      { yearMonth: '2026-01', income: 4200, expenses: 1500 },
      { yearMonth: '2026-11', income: 4200, expenses: 1600 },
    ])
    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ yearMonth: '2026-01', income: 4200, expenses: 1500 })
    expect(months[5]).toEqual({ yearMonth: '2026-06', income: 0, expenses: 0 })
    expect(months[10]).toEqual({ yearMonth: '2026-11', income: 4200, expenses: 1600 })
  })

  it('totals match the sum of months', () => {
    const months = fillYear('2026', [
      { yearMonth: '2026-03', income: 100, expenses: 40 },
      { yearMonth: '2026-04', income: 200, expenses: 60 },
    ])
    expect(months.reduce((s, m) => s + m.income, 0)).toBe(300)
    expect(months.reduce((s, m) => s + m.expenses, 0)).toBe(100)
  })
})
