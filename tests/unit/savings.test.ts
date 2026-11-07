import { describe, expect, it } from 'vitest'
import {
  applyContribution,
  defaultContributionAmount,
  daysUntilTargetDate,
  exceedsRemaining,
  findRankedGoal,
  formatDaysUntilLabel,
  hasOpenSavingsGoal,
  MONEY_EPSILON,
  normalizeSavingsGoalCreate,
  normalizeSavingsGoalUpdate,
  parsePositiveAmount,
  partitionSavingsGoals,
  rankOpenSavingsGoals,
  savingsProgressPercent,
  savingsRemaining,
  shouldPromptFundGoal,
} from '#/lib/savings'
import type { SavingsGoalRow } from '#/lib/types'

function goal(
  partial: Partial<SavingsGoalRow> & Pick<SavingsGoalRow, 'id' | 'name'>,
): SavingsGoalRow {
  return {
    targetAmount: 100,
    currentAmount: 0,
    targetDate: null,
    categoryId: null,
    category: null,
    ...partial,
  }
}

describe('savingsRemaining / progress', () => {
  it('clamps remaining at zero when over target', () => {
    expect(savingsRemaining({ targetAmount: 100, currentAmount: 40 })).toBe(60)
    expect(savingsRemaining({ targetAmount: 100, currentAmount: 120 })).toBe(0)
  })

  it('treats tiny float leftovers as complete', () => {
    expect(
      savingsRemaining({
        targetAmount: 100,
        currentAmount: 100 - MONEY_EPSILON / 2,
      }),
    ).toBe(0)
  })

  it('computes progress percent', () => {
    expect(
      savingsProgressPercent({ targetAmount: 100, currentAmount: 25 }),
    ).toBe(25)
    expect(savingsProgressPercent({ targetAmount: 0, currentAmount: 0 })).toBe(
      100,
    )
    expect(
      savingsProgressPercent({ targetAmount: 50, currentAmount: 80 }),
    ).toBe(100)
  })
})

describe('partitionSavingsGoals', () => {
  it('splits open and complete in one pass', () => {
    const rows = [
      goal({ id: 'a', name: 'A', currentAmount: 10 }),
      goal({ id: 'b', name: 'B', currentAmount: 100 }),
      goal({ id: 'c', name: 'C', currentAmount: 99 }),
    ]
    const { open, complete } = partitionSavingsGoals(rows)
    expect(open.map((g) => g.id)).toEqual(['a', 'c'])
    expect(complete.map((g) => g.id)).toEqual(['b'])
    expect(hasOpenSavingsGoal(rows)).toBe(true)
    expect(hasOpenSavingsGoal(complete)).toBe(false)
  })
})

describe('shouldPromptFundGoal', () => {
  it('prompts on cold cache and when any goal is open', () => {
    expect(shouldPromptFundGoal(undefined)).toBe(true)
    expect(shouldPromptFundGoal([])).toBe(false)
    expect(
      shouldPromptFundGoal([
        goal({ id: 'done', name: 'Done', currentAmount: 100 }),
      ]),
    ).toBe(false)
    expect(
      shouldPromptFundGoal([
        goal({ id: 'open', name: 'Open', currentAmount: 10 }),
      ]),
    ).toBe(true)
  })
})

describe('rankOpenSavingsGoals', () => {
  it('prefers category match then lowest remaining', () => {
    const rows = [
      goal({
        id: 'far',
        name: 'Far',
        currentAmount: 90,
        categoryId: 'other',
      }),
      goal({
        id: 'match-big',
        name: 'Match big',
        currentAmount: 10,
        categoryId: 'salary',
      }),
      goal({
        id: 'match-small',
        name: 'Match small',
        currentAmount: 80,
        categoryId: 'salary',
      }),
      goal({
        id: 'done',
        name: 'Done',
        currentAmount: 100,
        categoryId: 'salary',
      }),
    ]
    const ranked = rankOpenSavingsGoals(rows, 'salary')
    expect(ranked.map((r) => r.goal.id)).toEqual([
      'match-small',
      'match-big',
      'far',
    ])
    expect(ranked[0]?.categoryMatch).toBe(true)
    expect(ranked[0]?.remaining).toBe(20)
    expect(ranked[2]?.categoryMatch).toBe(false)
  })

  it('does not match null categoryId against empty income category', () => {
    const ranked = rankOpenSavingsGoals(
      [goal({ id: 'any', name: 'Any', categoryId: null })],
      '',
    )
    expect(ranked).toHaveLength(1)
    expect(ranked[0]?.categoryMatch).toBe(false)
  })

  it('breaks ties by name then id for stable order', () => {
    const ranked = rankOpenSavingsGoals(
      [
        goal({ id: 'b', name: 'Beta', currentAmount: 50 }),
        goal({ id: 'a', name: 'Alpha', currentAmount: 50 }),
        goal({ id: 'c', name: 'Alpha', currentAmount: 50 }),
      ],
      'none',
    )
    expect(ranked.map((r) => r.goal.id)).toEqual(['a', 'c', 'b'])
  })

  it('finds a ranked goal by id', () => {
    const ranked = rankOpenSavingsGoals(
      [goal({ id: 'x', name: 'X', currentAmount: 30 })],
      'none',
    )
    expect(findRankedGoal(ranked, 'x')?.remaining).toBe(70)
    expect(findRankedGoal(ranked, 'missing')).toBeUndefined()
  })
})

describe('contribution helpers', () => {
  it('defaults fund amount to min(income, remaining)', () => {
    expect(defaultContributionAmount(500, 200)).toBe(200)
    expect(defaultContributionAmount(50, 200)).toBe(50)
    expect(defaultContributionAmount(-10, 200)).toBe(0)
    expect(defaultContributionAmount(50, 0)).toBe(0)
    expect(defaultContributionAmount(Number.NaN, 10)).toBe(0)
  })

  it('parses positive amounts only', () => {
    expect(parsePositiveAmount('12.5')).toBe(12.5)
    expect(parsePositiveAmount('0')).toBeNull()
    expect(parsePositiveAmount('-1')).toBeNull()
    expect(parsePositiveAmount('abc')).toBeNull()
  })

  it('detects amounts that exceed remaining with epsilon', () => {
    expect(exceedsRemaining(20, 20)).toBe(false)
    expect(exceedsRemaining(20 + MONEY_EPSILON / 2, 20)).toBe(false)
    expect(exceedsRemaining(20.01, 20)).toBe(true)
  })

  it('applies contribution without exceeding target', () => {
    expect(
      applyContribution({ targetAmount: 100, currentAmount: 80 }, 50),
    ).toBe(100)
    expect(
      applyContribution({ targetAmount: 100, currentAmount: 20 }, 15),
    ).toBe(35)
    expect(() =>
      applyContribution({ targetAmount: 100, currentAmount: 20 }, 0),
    ).toThrow(/greater than 0/)
    expect(() =>
      applyContribution({ targetAmount: 100, currentAmount: 20 }, -5),
    ).toThrow(/greater than 0/)
    expect(() =>
      applyContribution({ targetAmount: 0, currentAmount: 0 }, 5),
    ).toThrow(/Invalid savings goal target/)
  })
})

describe('normalizeSavingsGoalCreate / Update', () => {
  it('normalizes create and clamps current to target', () => {
    expect(
      normalizeSavingsGoalCreate({
        name: '  Trip  ',
        targetAmount: 500,
        currentAmount: 600,
        categoryId: 'cat-1',
      }),
    ).toEqual({
      name: 'Trip',
      targetAmount: 500,
      currentAmount: 500,
      targetDate: null,
      categoryId: 'cat-1',
    })
  })

  it('rejects invalid create input', () => {
    expect(() =>
      normalizeSavingsGoalCreate({ name: '  ', targetAmount: 10 }),
    ).toThrow(/Name/)
    expect(() =>
      normalizeSavingsGoalCreate({ name: 'X', targetAmount: 0 }),
    ).toThrow(/Target/)
    expect(() =>
      normalizeSavingsGoalCreate({
        name: 'X',
        targetAmount: 10,
        currentAmount: -1,
      }),
    ).toThrow(/Current/)
  })

  it('normalizes updates and clamps when target shrinks', () => {
    expect(
      normalizeSavingsGoalUpdate(
        { targetAmount: 40 },
        { targetAmount: 100, currentAmount: 80 },
      ),
    ).toEqual({ targetAmount: 40, currentAmount: 40 })

    expect(
      normalizeSavingsGoalUpdate(
        { name: '  New  ' },
        { targetAmount: 100, currentAmount: 10 },
      ),
    ).toEqual({ name: 'New' })

    expect(
      normalizeSavingsGoalUpdate({}, { targetAmount: 100, currentAmount: 10 }),
    ).toBeNull()
  })
})

describe('daysUntilTargetDate', () => {
  it('labels relative days', () => {
    expect(daysUntilTargetDate('2026-10-30', '2026-10-27')).toBe(3)
    expect(daysUntilTargetDate('2026-10-27', '2026-10-27')).toBe(0)
    expect(daysUntilTargetDate('2026-10-20', '2026-10-27')).toBe(-7)
    expect(daysUntilTargetDate(null)).toBeNull()
    expect(daysUntilTargetDate('not-a-date', '2026-10-27')).toBeNull()
    expect(formatDaysUntilLabel(3)).toBe('3 days left')
    expect(formatDaysUntilLabel(0)).toBe('Due today')
    expect(formatDaysUntilLabel(-2)).toBe('2 days overdue')
  })
})
