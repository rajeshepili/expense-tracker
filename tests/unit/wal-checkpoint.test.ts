import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearScheduledCheckpointWal,
  scheduleCheckpointWal,
} from '#/db/index'

describe('scheduleCheckpointWal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearScheduledCheckpointWal()
  })

  afterEach(() => {
    clearScheduledCheckpointWal()
    vi.useRealTimers()
  })

  it('coalesces rapid schedules into one timer', () => {
    scheduleCheckpointWal(1_000)
    scheduleCheckpointWal(1_000)
    scheduleCheckpointWal(1_000)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('clearScheduledCheckpointWal cancels the pending timer', () => {
    scheduleCheckpointWal(1_000)
    expect(vi.getTimerCount()).toBe(1)
    clearScheduledCheckpointWal()
    expect(vi.getTimerCount()).toBe(0)
  })
})
