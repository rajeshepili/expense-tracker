import { describe, expect, it } from 'vitest'
import {
  accountBalance,
  inferAccountTypeFromName,
  isCashflowTransaction,
  isIsoDate,
  MONEY_EPSILON,
  netWorth,
  orphanTransferIds,
  signedDelta,
} from '#/lib/finance'

describe('isCashflowTransaction', () => {
  it('includes income and expense only', () => {
    expect(isCashflowTransaction('income')).toBe(true)
    expect(isCashflowTransaction('expense')).toBe(true)
    expect(isCashflowTransaction('transfer')).toBe(false)
  })
})

describe('signedDelta', () => {
  it('applies the asset matrix', () => {
    expect(signedDelta('asset', { type: 'income', amount: 10 })).toBe(10)
    expect(signedDelta('asset', { type: 'expense', amount: 10 })).toBe(-10)
    expect(
      signedDelta('asset', {
        type: 'transfer',
        amount: 10,
        transferDirection: 'out',
      }),
    ).toBe(-10)
    expect(
      signedDelta('asset', {
        type: 'transfer',
        amount: 10,
        transferDirection: 'in',
      }),
    ).toBe(10)
  })

  it('applies the liability matrix', () => {
    expect(signedDelta('liability', { type: 'income', amount: 10 })).toBe(-10)
    expect(signedDelta('liability', { type: 'expense', amount: 10 })).toBe(10)
    expect(
      signedDelta('liability', {
        type: 'transfer',
        amount: 10,
        transferDirection: 'out',
      }),
    ).toBe(10)
    expect(
      signedDelta('liability', {
        type: 'transfer',
        amount: 10,
        transferDirection: 'in',
      }),
    ).toBe(-10)
  })
})

describe('accountBalance and netWorth', () => {
  it('starts from startingBalance and sums signed deltas', () => {
    const balance = accountBalance(
      100,
      [
        { type: 'income', amount: 50 },
        { type: 'expense', amount: 20 },
        { type: 'transfer', amount: 10, transferDirection: 'out' },
      ],
      'asset',
    )
    expect(balance).toBe(120)
  })

  it('tracks credit card purchase then payment without double-counting cashflow', () => {
    const cardPurchase = { type: 'expense' as const, amount: 50 }
    const paymentIn = {
      type: 'transfer' as const,
      amount: 50,
      transferDirection: 'in' as const,
    }
    const paymentOut = {
      type: 'transfer' as const,
      amount: 50,
      transferDirection: 'out' as const,
    }

    const cardDebt = accountBalance(0, [cardPurchase, paymentIn], 'liability')
    const checking = accountBalance(200, [paymentOut], 'asset')
    const cashflowExpenses = [cardPurchase, paymentOut, paymentIn]
      .filter((row) => isCashflowTransaction(row.type))
      .reduce((sum, row) => sum + row.amount, 0)

    expect(cardDebt).toBe(0)
    expect(checking).toBe(150)
    expect(cashflowExpenses).toBe(50)
    expect(
      netWorth([
        { type: 'asset', balance: checking },
        { type: 'liability', balance: cardDebt },
      ]),
    ).toBe(150)
  })

  it('keeps net worth stable across asset-to-asset transfers', () => {
    const before = netWorth([
      { type: 'asset', balance: 100 },
      { type: 'asset', balance: 40 },
    ])
    const after = netWorth([
      {
        type: 'asset',
        balance: accountBalance(
          100,
          [{ type: 'transfer', amount: 25, transferDirection: 'out' }],
          'asset',
        ),
      },
      {
        type: 'asset',
        balance: accountBalance(
          40,
          [{ type: 'transfer', amount: 25, transferDirection: 'in' }],
          'asset',
        ),
      },
    ])
    expect(before).toBe(140)
    expect(after).toBe(140)
  })

  it('skips closed accounts in net worth', () => {
    expect(
      netWorth([
        { type: 'asset', balance: 100 },
        { type: 'liability', balance: 40, closed: true },
      ]),
    ).toBe(100)
  })

  it('exposes a shared money epsilon', () => {
    expect(MONEY_EPSILON).toBeGreaterThan(0)
    expect(MONEY_EPSILON).toBeLessThan(0.01)
  })
})

describe('inferAccountTypeFromName (createPaymentMethod alias)', () => {
  it('marks credit cards as liabilities and others as assets', () => {
    expect(inferAccountTypeFromName('Credit card')).toBe('liability')
    expect(inferAccountTypeFromName('My CREDIT CARD')).toBe('liability')
    expect(inferAccountTypeFromName('Cash')).toBe('asset')
    expect(inferAccountTypeFromName('Debit card')).toBe('asset')
  })
})

describe('isIsoDate', () => {
  it('accepts real calendar dates only', () => {
    expect(isIsoDate('2026-03-15')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('03-15-2026')).toBe(false)
  })
})

describe('orphanTransferIds', () => {
  it('keeps intact pairs and flags one-sided or mismatched links', () => {
    expect(
      orphanTransferIds([
        {
          id: 'a',
          transferId: 'b',
          transferDirection: 'out',
          type: 'transfer',
        },
        {
          id: 'b',
          transferId: 'a',
          transferDirection: 'in',
          type: 'transfer',
        },
      ]),
    ).toEqual([])

    expect(
      orphanTransferIds([
        {
          id: 'lonely',
          transferId: 'missing',
          transferDirection: 'out',
          type: 'transfer',
        },
      ]),
    ).toEqual(['lonely'])

    expect(
      orphanTransferIds([
        {
          id: 'a',
          transferId: 'b',
          transferDirection: 'out',
          type: 'transfer',
        },
        {
          id: 'b',
          transferId: 'a',
          transferDirection: 'out',
          type: 'transfer',
        },
      ]),
    ).toEqual(['a', 'b'])
  })
})
