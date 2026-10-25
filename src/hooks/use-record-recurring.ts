import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  recordRecurringPayment,
  skipRecurringOccurrence,
  type RecordRecurringOverrides,
} from '#/data/repository'
import {
  amountDue,
  canOneTapRecord,
  formatIsoDate,
  money,
} from '#/lib/finance'
import { invalidateAfter } from '#/lib/query/invalidation'
import {
  readTransactionDefaults,
  rememberTransactionDefaults,
} from '#/lib/transaction-defaults'
import type { RecurringExpenseRow } from '#/lib/types'

export type AdjustDraft = {
  amount: string
  date: string
  paymentMethodId: string
}

export type ToastContext = {
  type: 'record' | 'adjust'
  amount?: number
  date?: string
}

export function useRecordRecurring() {
  const queryClient = useQueryClient()
  const [adjusting, setAdjusting] = useState<RecurringExpenseRow | null>(null)
  const [adjustDraft, setAdjustDraft] = useState<AdjustDraft>({
    amount: '',
    date: '',
    paymentMethodId: '',
  })
  const [pendingForce, setPendingForce] = useState<{
    id: string
    overrides: RecordRecurringOverrides
  } | null>(null)
  const [toastContext, setToastContext] = useState<ToastContext | null>(null)

  const recordMutation = useMutation({
    mutationFn: async (input: {
      id: string
      overrides?: RecordRecurringOverrides
      billPaymentMethodId?: string | null
    }) => {
      const defaults = readTransactionDefaults()
      const overrides: RecordRecurringOverrides = {
        paymentMethodId:
          input.overrides?.paymentMethodId !== undefined
            ? input.overrides.paymentMethodId || null
            : (input.billPaymentMethodId ??
              (defaults.paymentMethodId || null)),
        amount: input.overrides?.amount,
        date: input.overrides?.date,
        force: input.overrides?.force,
      }
      return recordRecurringPayment(input.id, overrides)
    },
    onSuccess: async (result, variables) => {
      if (!result.ok) {
        setPendingForce({
          id: variables.id,
          overrides: variables.overrides ?? {},
        })
        return
      }
      setPendingForce(null)
      setAdjusting(null)
      const defaults = readTransactionDefaults()
      rememberTransactionDefaults({
        type: 'expense',
        categoryId: defaults.categoryIdByType.expense ?? '',
        paymentMethodId:
          variables.overrides?.paymentMethodId !== undefined
            ? (variables.overrides.paymentMethodId ?? '')
            : defaults.paymentMethodId,
      })
      await invalidateAfter(queryClient, [
        'transactions',
        'recurring',
        'paymentMethods',
        'overview',
      ])

      if (result.partial && result.remainingAmount !== null) {
        toast.success(
          `Partial · ${money(result.remainingAmount)} left · still due ${formatIsoDate(result.nextDate, true)}`,
        )
      } else if (toastContext?.type === 'adjust') {
        const amt = toastContext.amount
          ? money(toastContext.amount)
          : money(variables.overrides?.amount ?? 0)
        const dt = toastContext.date
          ? formatIsoDate(toastContext.date, true)
          : 'today'
        toast.success(
          `Adjusted · recorded ${amt} for ${dt} · next ${formatIsoDate(result.nextDate, true)}`,
        )
      } else {
        toast.success(`Recorded · next ${formatIsoDate(result.nextDate, true)}`)
      }
      setToastContext(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const skipMutation = useMutation({
    mutationFn: skipRecurringOccurrence,
    onSuccess: async (result) => {
      await invalidateAfter(queryClient, ['recurring', 'overview'])
      toast.success(`Skipped · next ${formatIsoDate(result.nextDate, true)}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  function openAdjust(bill: RecurringExpenseRow) {
    const defaults = readTransactionDefaults()
    setAdjustDraft({
      amount: String(amountDue(bill)),
      date: bill.nextDate,
      paymentMethodId: bill.paymentMethodId ?? defaults.paymentMethodId,
    })
    setAdjusting(bill)
  }

  function cancelAdjust() {
    const defaults = readTransactionDefaults()
    setAdjustDraft({
      amount: '',
      date: '',
      paymentMethodId: defaults.paymentMethodId,
    })
    setAdjusting(null)
  }

  function recordOneTap(bill: RecurringExpenseRow) {
    if (!canOneTapRecord(bill.nextDate)) {
      openAdjust(bill)
      return
    }
    setToastContext({ type: 'record' })
    recordMutation.mutate({
      id: bill.id,
      billPaymentMethodId: bill.paymentMethodId,
    })
  }

  function submitAdjust() {
    if (!adjusting) return
    const amount = Number(adjustDraft.amount)
    setToastContext({ type: 'adjust', amount, date: adjustDraft.date })
    recordMutation.mutate({
      id: adjusting.id,
      billPaymentMethodId: adjusting.paymentMethodId,
      overrides: {
        amount,
        date: adjustDraft.date,
        paymentMethodId: adjustDraft.paymentMethodId || null,
      },
    })
  }

  function confirmForceRecord() {
    if (!pendingForce) return
    recordMutation.mutate({
      id: pendingForce.id,
      overrides: { ...pendingForce.overrides, force: true },
    })
  }

  function dismissForce() {
    setPendingForce(null)
  }

  return {
    adjusting,
    setAdjusting,
    adjustDraft,
    setAdjustDraft,
    openAdjust,
    cancelAdjust,
    recordOneTap,
    submitAdjust,
    skip: (id: string) => skipMutation.mutate(id),
    recording: recordMutation.isPending,
    skipping: skipMutation.isPending,
    pendingForce,
    confirmForceRecord,
    dismissForce,
  }
}
