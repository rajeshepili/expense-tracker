import { describe, expect, it } from 'vitest'
import {
  resolveSampleAccountName,
  SAMPLE_METHOD_TO_ACCOUNT,
} from '#/data/sample-account-map'
import {
  ledgerTransactions,
  sampleMethodLabels,
  recurringExpenses,
  sampleTransfers,
} from '#/data/sample-ledger'

describe('sample seed account mapping', () => {
  it('maps every sample payment method label to a concrete account', () => {
    for (const method of sampleMethodLabels) {
      expect(SAMPLE_METHOD_TO_ACCOUNT[method]).toBeTruthy()
      expect(resolveSampleAccountName(method)).toBe(
        SAMPLE_METHOD_TO_ACCOUNT[method],
      )
    }
  })

  it('resolves methods used by ledger, transfers, and recurring', () => {
    const used = new Set<string>()
    for (const tx of ledgerTransactions) used.add(tx.paymentMethod)
    for (const t of sampleTransfers) {
      used.add(t.fromAccount)
      used.add(t.toAccount)
    }
    for (const r of recurringExpenses) used.add(r.paymentMethod)

    for (const method of used) {
      expect(resolveSampleAccountName(method)).not.toBe('')
    }
  })

  it('defaults unknown methods to Checking', () => {
    expect(resolveSampleAccountName('Venmo')).toBe('Checking')
  })
})
