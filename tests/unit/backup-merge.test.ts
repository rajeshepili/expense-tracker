import { describe, expect, it } from 'vitest'
import {
  countSkipped,
  decideSettingsMerge,
  decideTimestampedMerge,
  planMerge,
  summarizeMergePlan,
} from '#/lib/backup-merge'
import type {
  BackupSnapshot,
  CategorySnapshot,
  SettingsSnapshot,
} from '#/lib/backup-merge'

function emptySnapshot(
  overrides: Partial<BackupSnapshot> = {},
): BackupSnapshot {
  return {
    settings: null,
    monthlyBudgets: [],
    categories: [],
    accounts: [],
    transactions: [],
    recurring: [],
    savings: [],
    ...overrides,
  }
}

function category(
  partial: Partial<CategorySnapshot> & Pick<CategorySnapshot, 'id'>,
): CategorySnapshot {
  return {
    name: 'Food',
    type: 'expense',
    createdAt: 100,
    ...partial,
  }
}

describe('decideTimestampedMerge', () => {
  it('inserts when local is missing', () => {
    expect(decideTimestampedMerge(undefined, { id: 'a', createdAt: 1 })).toBe(
      'insert',
    )
  })

  it('updates when backup createdAt is strictly newer', () => {
    expect(
      decideTimestampedMerge(
        { id: 'a', createdAt: 10 },
        { id: 'a', createdAt: 20 },
      ),
    ).toBe('update')
  })

  it('keeps local when timestamps are equal or older', () => {
    expect(
      decideTimestampedMerge(
        { id: 'a', createdAt: 20 },
        { id: 'a', createdAt: 20 },
      ),
    ).toBe('skip')
    expect(
      decideTimestampedMerge(
        { id: 'a', createdAt: 20 },
        { id: 'a', createdAt: 10 },
      ),
    ).toBe('skip')
  })

  it('normalizes millisecond timestamps before comparing', () => {
    expect(
      decideTimestampedMerge(
        { id: 'a', createdAt: 1_700_000_000 },
        { id: 'a', createdAt: 1_700_000_001_000 },
      ),
    ).toBe('update')
  })
})

describe('decideSettingsMerge', () => {
  const backup: SettingsSnapshot = {
    id: 'default',
    budget: 4000,
    currency: 'EUR',
    seededAt: 50,
  }

  it('takes backup when local is missing or not seeded', () => {
    expect(decideSettingsMerge(null, backup)).toEqual({
      replace: true,
      row: backup,
    })
    expect(
      decideSettingsMerge(
        { id: 'default', budget: 2500, currency: 'USD', seededAt: null },
        backup,
      ),
    ).toEqual({ replace: true, row: backup })
  })

  it('keeps local once seeded', () => {
    expect(
      decideSettingsMerge(
        { id: 'default', budget: 3000, currency: 'USD', seededAt: 40 },
        backup,
      ),
    ).toEqual({ replace: false, row: null })
  })
})

describe('planMerge', () => {
  it('inserts missing rows and skips equal-id locals', () => {
    const local = emptySnapshot({
      settings: {
        id: 'default',
        budget: 2000,
        currency: 'USD',
        seededAt: 10,
      },
      categories: [category({ id: 'c1', name: 'Food', createdAt: 10 })],
      monthlyBudgets: [{ yearMonth: '2026-01', budget: 100 }],
    })
    const incoming = emptySnapshot({
      settings: {
        id: 'default',
        budget: 9999,
        currency: 'EUR',
        seededAt: 99,
      },
      categories: [
        category({ id: 'c1', name: 'Food renamed', createdAt: 10 }),
        category({ id: 'c2', name: 'Rent', createdAt: 20 }),
      ],
      monthlyBudgets: [
        { yearMonth: '2026-01', budget: 999 },
        { yearMonth: '2026-02', budget: 200 },
      ],
      transactions: [
        {
          id: 't1',
          description: 'Coffee',
          amount: 4,
          type: 'expense',
          transactionDate: '2026-01-02',
          categoryId: 'c1',
          accountId: null,
          sourceRecurringId: null,
          transferId: null,
          transferDirection: null,
          createdAt: 30,
        },
      ],
    })

    const plan = planMerge(local, incoming)
    expect(plan.replaceSettings).toBe(false)
    expect(plan.monthlyBudgets).toEqual([{ yearMonth: '2026-02', budget: 200 }])
    expect(plan.categories).toEqual([
      {
        action: 'insert',
        row: expect.objectContaining({ id: 'c2', name: 'Rent' }),
      },
    ])
    expect(plan.transactions).toHaveLength(1)
    expect(plan.transactions[0]?.action).toBe('insert')

    const stats = summarizeMergePlan(plan)
    stats.skipped = countSkipped(local, incoming, plan)
    expect(stats.inserted).toBe(3) // month + category + tx
    expect(stats.updated).toBe(0)
    expect(stats.skipped).toBe(3) // settings + month + category c1
    expect(stats.settingsReplaced).toBe(false)
  })

  it('updates when backup row is newer by createdAt', () => {
    const local = emptySnapshot({
      categories: [category({ id: 'c1', name: 'Old', createdAt: 10 })],
    })
    const incoming = emptySnapshot({
      categories: [category({ id: 'c1', name: 'New', createdAt: 50 })],
    })
    const plan = planMerge(local, incoming)
    expect(plan.categories).toEqual([
      {
        action: 'update',
        row: expect.objectContaining({ name: 'New' }),
      },
    ])
  })

  it('adopts backup settings during pre-onboarding restore', () => {
    const local = emptySnapshot({
      settings: {
        id: 'default',
        budget: 2500,
        currency: 'USD',
        seededAt: null,
      },
    })
    const incoming = emptySnapshot({
      settings: {
        id: 'default',
        budget: 1800,
        currency: 'GBP',
        seededAt: 99,
      },
    })
    const plan = planMerge(local, incoming)
    expect(plan.replaceSettings).toBe(true)
    expect(plan.settings?.budget).toBe(1800)
    expect(plan.settings?.currency).toBe('GBP')
  })
})
