import { describe, expect, it } from 'vitest'
import { ledgerHasMore } from '#/lib/ledger-page'

describe('ledgerHasMore', () => {
  it('hides the control while totals are still loading', () => {
    expect(
      ledgerHasMore({
        rowCount: 300,
        totalCount: 0,
        pageLimit: 300,
        totalsPending: true,
      }),
    ).toBe(false)
  })

  it('is true when the page is full and more rows exist', () => {
    expect(
      ledgerHasMore({
        rowCount: 300,
        totalCount: 450,
        pageLimit: 300,
      }),
    ).toBe(true)
  })

  it('is false when the page is not full', () => {
    expect(
      ledgerHasMore({
        rowCount: 40,
        totalCount: 40,
        pageLimit: 300,
      }),
    ).toBe(false)
  })

  it('is false when every matching row is already loaded', () => {
    expect(
      ledgerHasMore({
        rowCount: 300,
        totalCount: 300,
        pageLimit: 300,
      }),
    ).toBe(false)
  })
})
