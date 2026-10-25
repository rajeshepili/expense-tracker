import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  recordRecurringPayment,
  skipRecurringOccurrence,
} from '#/data/repository'
import { withQueryClient } from '../test-utils'
import type { RecurringExpenseRow } from '#/lib/types'

vi.mock('#/data/repository', () => ({
  recordRecurringPayment: vi.fn(),
  skipRecurringOccurrence: vi.fn(),
}))

vi.mock('#/lib/transaction-defaults', () => ({
  readTransactionDefaults: vi.fn(() => ({
    type: 'expense' as const,
    categoryIdByType: { expense: 'cat-1' },
    paymentMethodId: 'method-1',
  })),
  rememberTransactionDefaults: vi.fn(),
}))

vi.mock('#/lib/query/invalidation', () => ({
  invalidateAfter: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const bill: RecurringExpenseRow = {
  id: 'bill-1',
  name: 'Rent',
  amount: 1200,
  remainingAmount: null,
  categoryId: 'cat-1',
  cadence: 'monthly',
  nextDate: '2020-01-01',
  active: true,
  category: 'Housing',
  paymentMethod: null,
  paymentMethodId: null,
}

const recorded = {
  ok: true as const,
  transactionId: 'tx-1',
  nextDate: '2026-11-25',
  alreadyRecorded: false,
  partial: false,
  remainingAmount: null,
}

function mockRecordOk(result: typeof recorded = recorded) {
  vi.mocked(recordRecurringPayment).mockResolvedValue(result)
}

function renderRecorder() {
  return renderHook(() => useRecordRecurring(), {
    wrapper: withQueryClient(),
  })
}

describe('useRecordRecurring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('one-tap Record prefers the bill method, else the remembered default', async () => {
    mockRecordOk()
    const { result } = renderRecorder()

    act(() => {
      result.current.recordOneTap(bill)
    })

    await waitFor(() => {
      expect(recordRecurringPayment).toHaveBeenCalledWith('bill-1', {
        paymentMethodId: 'method-1',
        amount: undefined,
        date: undefined,
        force: undefined,
      })
    })

    vi.clearAllMocks()
    mockRecordOk()
    act(() => {
      result.current.recordOneTap({
        ...bill,
        id: 'bill-2',
        paymentMethodId: 'method-bill',
        paymentMethod: 'Debit',
      })
    })

    await waitFor(() => {
      expect(recordRecurringPayment).toHaveBeenCalledWith('bill-2', {
        paymentMethodId: 'method-bill',
        amount: undefined,
        date: undefined,
        force: undefined,
      })
    })
  })

  it('upcoming one-tap opens Adjust instead of recording immediately', () => {
    mockRecordOk()
    const { result } = renderRecorder()
    const upcoming = { ...bill, nextDate: '2099-12-01' }

    act(() => {
      result.current.recordOneTap(upcoming)
    })

    expect(recordRecurringPayment).not.toHaveBeenCalled()
    expect(result.current.adjusting).toEqual(upcoming)
    expect(result.current.adjustDraft.date).toBe('2099-12-01')
  })

  it('Adjust prefers the bill payment method over the global default', () => {
    const { result } = renderRecorder()

    act(() => {
      result.current.openAdjust({
        ...bill,
        paymentMethodId: 'method-bill',
        paymentMethod: 'Debit',
      })
    })

    expect(result.current.adjustDraft.paymentMethodId).toBe('method-bill')
  })

  it('Adjust prefills the remaining balance when the cycle is partially paid', () => {
    const { result } = renderRecorder()

    act(() => {
      result.current.openAdjust({
        ...bill,
        amount: 15,
        remainingAmount: 5,
      })
    })

    expect(result.current.adjustDraft.amount).toBe('5')
  })

  it('Adjust opens with bill amount/date and the default payment method', () => {
    const { result } = renderRecorder()

    act(() => {
      result.current.openAdjust(bill)
    })

    expect(result.current.adjusting).toEqual(bill)
    expect(result.current.adjustDraft).toEqual({
      amount: '1200',
      date: '2020-01-01',
      paymentMethodId: 'method-1',
    })
  })

  it('Adjust submit posts amount, date, and payment method overrides', async () => {
    mockRecordOk({ ...recorded, nextDate: '2026-11-15' })
    const { result } = renderRecorder()

    act(() => {
      result.current.openAdjust(bill)
      result.current.setAdjustDraft({
        amount: '1300',
        date: '2026-10-28',
        paymentMethodId: 'method-2',
      })
    })

    act(() => {
      result.current.submitAdjust()
    })

    await waitFor(() => {
      expect(recordRecurringPayment).toHaveBeenCalledWith('bill-1', {
        amount: 1300,
        date: '2026-10-28',
        paymentMethodId: 'method-2',
        force: undefined,
      })
    })
  })

  it('canceling Adjust restores the default payment method on reopen', () => {
    const { result } = renderRecorder()

    act(() => {
      result.current.openAdjust(bill)
      result.current.setAdjustDraft({
        amount: '1300',
        date: '2026-10-28',
        paymentMethodId: 'method-2',
      })
    })

    act(() => {
      result.current.cancelAdjust()
    })

    act(() => {
      result.current.openAdjust({ ...bill, id: 'bill-2' })
    })

    expect(result.current.adjustDraft.paymentMethodId).toBe('method-1')
  })

  it('already_recorded opens a force confirm, then retries with force: true', async () => {
    vi.mocked(recordRecurringPayment)
      .mockResolvedValueOnce({
        ok: false,
        reason: 'already_recorded',
        nextDate: '2026-11-25',
      })
      .mockResolvedValueOnce({
        ok: true,
        transactionId: 'tx-2',
        nextDate: '2026-12-25',
        alreadyRecorded: false,
        partial: false,
        remainingAmount: null,
      })

    const { result } = renderRecorder()

    act(() => {
      result.current.recordOneTap(bill)
    })

    await waitFor(() => {
      expect(result.current.pendingForce).toEqual({
        id: 'bill-1',
        overrides: {},
      })
    })

    act(() => {
      result.current.confirmForceRecord()
    })

    await waitFor(() => {
      expect(recordRecurringPayment).toHaveBeenCalledTimes(2)
    })

    expect(vi.mocked(recordRecurringPayment).mock.calls[1]).toEqual([
      'bill-1',
      expect.objectContaining({ force: true }),
    ])
  })

  it('Skip advances the next date without recording a payment', async () => {
    vi.mocked(skipRecurringOccurrence).mockResolvedValue({
      nextDate: '2026-11-25',
    })
    const { result } = renderRecorder()

    act(() => {
      result.current.skip('bill-1')
    })

    await waitFor(() => {
      expect(skipRecurringOccurrence).toHaveBeenCalled()
    })
    // useMutation passes Query meta as a 2nd arg; assert the bill id only.
    expect(vi.mocked(skipRecurringOccurrence).mock.calls[0]?.[0]).toBe('bill-1')
    expect(recordRecurringPayment).not.toHaveBeenCalled()
  })
})
