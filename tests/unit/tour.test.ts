import { beforeEach, describe, expect, it } from 'vitest'
import { isTourDone, markTourDone } from '#/lib/tour'
import { installMemoryLocalStorage } from '../test-utils'

beforeEach(() => {
  installMemoryLocalStorage()
})

describe('one-time tour gate', () => {
  it('is not done by default', () => {
    expect(isTourDone()).toBe(false)
  })

  it('stays done once marked (finished or skipped)', () => {
    markTourDone()
    expect(isTourDone()).toBe(true)
  })

  it('treats unreadable storage as not done', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(isTourDone()).toBe(false)
  })
})
