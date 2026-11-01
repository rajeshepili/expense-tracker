import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RecurringExpenseRow } from '#/lib/types'
import { queryKeys } from '#/lib/query/keys'
import {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  setRecurringActive,
} from '#/data/repository'
import { useOptimisticMutation } from '#/hooks/use-optimistic-mutation'
import { invalidateAfter } from '#/lib/query/invalidation'
import { makeMutationErrorHandler } from '#/lib/errors'
import { rememberTransactionDefaults } from '#/lib/transaction-defaults'

export type RecurringFormState = {
  name: string
  amount: string
  cadence: 'weekly' | 'monthly' | 'yearly'
  nextDate: string
  categoryId: string
  paymentMethodId: string
  active: boolean
}

export type RecurringSaveVars = {
  name: string
  amount: number
  cadence: 'weekly' | 'monthly' | 'yearly'
  nextDate: string
  categoryId: string
  paymentMethodId: string | null
  active: boolean
}

export function emptyRecurringForm(): RecurringFormState {
  return {
    name: '',
    amount: '',
    cadence: 'monthly',
    nextDate: '',
    categoryId: '',
    paymentMethodId: '',
    active: true,
  }
}

export function formFromRecurringRow(row: RecurringExpenseRow): RecurringFormState {
  return {
    name: row.name,
    amount: String(row.amount),
    cadence: row.cadence,
    nextDate: row.nextDate,
    categoryId: row.categoryId,
    paymentMethodId: row.paymentMethodId ?? '',
    active: row.active,
  }
}

export function sortRecurring(items: RecurringExpenseRow[]): RecurringExpenseRow[] {
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime()
  })
}

interface UseRecurringFormArgs {
  onClose: () => void
  editing: RecurringExpenseRow | null
  form: RecurringFormState
  setForm: React.Dispatch<React.SetStateAction<RecurringFormState>>
  setComposerOpen: (open: boolean) => void
  reset: () => void
  setSaveError: (error: string | null) => void
  setDeleting: (item: RecurringExpenseRow | null) => void
  deleting: RecurringExpenseRow | null
}

export function useRecurringForm({
  onClose,
  editing,
  form,
  setForm,
  setComposerOpen,
  reset,
  setSaveError,
  setDeleting,
  deleting,
}: UseRecurringFormArgs) {
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount)
      if (!form.name.trim() || !Number.isFinite(amount) || amount < 0) {
        throw new Error('Enter a name and a valid amount')
      }
      if (!form.categoryId) throw new Error('Choose a category')
      if (editing) {
        await updateRecurring(editing.id, {
          name: form.name,
          amount,
          cadence: form.cadence,
          nextDate: form.nextDate,
          categoryId: form.categoryId,
          paymentMethodId: form.paymentMethodId || null,
          active: editing.active,
        })
      } else {
        await createRecurring({
          name: form.name,
          amount,
          cadence: form.cadence,
          nextDate: form.nextDate,
          categoryId: form.categoryId,
          paymentMethodId: form.paymentMethodId || null,
          active: true,
        })
      }
    },
    onSuccess: async () => {
      rememberTransactionDefaults({
        type: 'expense',
        categoryId: form.categoryId,
        paymentMethodId: form.paymentMethodId,
      })
      await invalidateAfter(queryClient, [
        'recurring',
        'categories',
        'paymentMethods',
      ])
      onClose()
    },
    onError: makeMutationErrorHandler(
      setSaveError,
      'Could not save',
      { reopenDialog: () => setComposerOpen(true) },
    ),
  })

  const toggleMutation = useOptimisticMutation<
    RecurringExpenseRow[],
    { id: string; active: boolean }
  >({
    queryClient,
    queryKey: queryKeys.recurring,
    invalidateKeys: ['recurring'],
    mutationFn: ({ id, active }) => setRecurringActive(id, active),
    onMutate: ({ id, active }) => {
      queryClient.setQueryData<RecurringExpenseRow[]>(
        queryKeys.recurring,
        (current) =>
          current?.map((row) => (row.id === id ? { ...row, active } : row)),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No recurring item selected')
      await deleteRecurring(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'recurring',
        'categories',
        'paymentMethods',
      ])
      setDeleting(null)
      onClose()
    },
    onError: makeMutationErrorHandler(
      setSaveError,
      'Could not delete',
    ),
  })

  function openCreate() {
    reset()
    setForm((current) => ({
      ...current,
      active: true,
    }))
    setComposerOpen(true)
  }

  function openEdit(row: RecurringExpenseRow) {
    setForm(formFromRecurringRow(row))
    setComposerOpen(true)
  }

  function handleSubmit() {
    const amount = Number(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount < 0) {
      setSaveError('Enter a name and a valid amount')
      return
    }
    if (!form.categoryId) {
      setSaveError('Choose a category')
      return
    }
    if (editing) updateRecurring(editing.id, {
      name: form.name,
      amount,
      cadence: form.cadence,
      nextDate: form.nextDate,
      categoryId: form.categoryId,
      paymentMethodId: form.paymentMethodId || null,
      active: editing.active,
    })
    else createRecurring({
      name: form.name,
      amount,
      cadence: form.cadence,
      nextDate: form.nextDate,
      categoryId: form.categoryId,
      paymentMethodId: form.paymentMethodId || null,
      active: true,
    })
  }

  function askDelete(item: RecurringExpenseRow) {
    setDeleting(item)
  }

  const isSubmitting = saveMutation.isPending || deleteMutation.isPending || toggleMutation.isPending

  return {
    saveMutation,
    toggleMutation,
    deleteMutation,
    openCreate,
    openEdit,
    handleSubmit,
    askDelete,
    isSubmitting,
  }
}