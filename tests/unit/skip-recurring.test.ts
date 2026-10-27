import { describe, expect, it } from 'vitest'
import { skipRecurringPatch } from '#/lib/finance'

describe('skipRecurringPatch', () => {
  it('advances the next date and clears a partial remaining balance', () => {
    expect(
      skipRecurringPatch({
        nextDate: '2026-03-15',
        cadence: 'monthly',
      }),
    ).toEqual({
      nextDate: '2026-04-15',
      remainingAmount: null,
    })
  })
})
