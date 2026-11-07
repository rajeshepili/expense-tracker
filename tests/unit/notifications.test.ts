import { describe, expect, it } from 'vitest'
import { dueSoonReminders } from '#/lib/notifications'
import type { RecurringExpenseRow } from '#/lib/types'

function row(overrides: Partial<RecurringExpenseRow>): RecurringExpenseRow {
  return {
    id: 'r1',
    name: 'Rent',
    kind: 'expense',
    amount: 1200,
    remainingAmount: null,
    category: 'Housing',
    categoryId: 'c1',
    cadence: 'monthly',
    nextDate: '2026-11-05',
    active: true,
    paymentMethod: null,
    paymentMethodId: null,
    accountId: null,
    account: null,
    ...overrides,
  }
}

describe('dueSoonReminders', () => {
  const today = '2026-11-04'

  it('includes items due today and within the window', () => {
    const result = dueSoonReminders(
      [
        row({ id: 'a', nextDate: '2026-11-04' }),
        row({ id: 'b', nextDate: '2026-11-06' }),
      ],
      today,
    )
    expect(result.map((r) => r.id)).toEqual(['a', 'b'])
    expect(result[0]?.daysUntil).toBe(0)
    expect(result[1]?.daysUntil).toBe(2)
  })

  it('excludes overdue and far-future items', () => {
    const result = dueSoonReminders(
      [
        row({ id: 'old', nextDate: '2026-11-01' }),
        row({ id: 'far', nextDate: '2026-11-20' }),
      ],
      today,
    )
    expect(result).toEqual([])
  })

  it('excludes inactive items', () => {
    const result = dueSoonReminders([row({ active: false })], today)
    expect(result).toEqual([])
  })

  it('sorts by next date', () => {
    const result = dueSoonReminders(
      [
        row({ id: 'later', nextDate: '2026-11-06' }),
        row({ id: 'sooner', nextDate: '2026-11-05' }),
      ],
      today,
    )
    expect(result.map((r) => r.id)).toEqual(['sooner', 'later'])
  })
})
