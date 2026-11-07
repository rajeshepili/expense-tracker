import { describe, expect, it } from 'vitest'
import { canTransferBetweenAccounts, soleAccountId } from '#/lib/sole-account'

describe('soleAccountId', () => {
  it('returns the only account id', () => {
    expect(soleAccountId([{ id: 'a1' }])).toBe('a1')
  })

  it('returns null when zero or many accounts', () => {
    expect(soleAccountId([])).toBeNull()
    expect(soleAccountId([{ id: 'a1' }, { id: 'a2' }])).toBeNull()
  })
})

describe('canTransferBetweenAccounts', () => {
  it('requires at least two accounts', () => {
    expect(canTransferBetweenAccounts([])).toBe(false)
    expect(canTransferBetweenAccounts([{ id: 'a1' }])).toBe(false)
    expect(canTransferBetweenAccounts([{ id: 'a1' }, { id: 'a2' }])).toBe(true)
  })
})
