import { useQueryClient } from '@tanstack/react-query'
import type { FundGoalOffer } from '#/features/savings/fund-goal-dialog'
import type { LedgerTransaction, SavingsGoalRow } from '#/lib/types'
import { queryKeys } from '#/lib/query/keys'
import {
  createTransaction,
  createTransfer,
  updateTransaction,
  updateTransfer,
  deleteTransaction,
} from '#/data/repository'
import { useOptimisticMutation } from '#/hooks/use-optimistic-mutation'
import { findPossibleDuplicate } from '#/lib/duplicate'
import { formatIsoDate, defaultDateForMonth, todayIso } from '#/lib/finance'
import { makeMutationErrorHandler } from '#/lib/errors'
import { rememberTransactionDefaults } from '#/lib/transaction-defaults'
import { shouldPromptFundGoal } from '#/lib/savings'
import { soleAccountId } from '#/lib/sole-account'
import {
  emptyLedgerForm,
  formFromTransaction,
  formFromTransferLeg,
  transactionMeta,
  transferBadgeClass,
} from '#/features/ledger/form-state'
import type {
  LedgerFormState,
  LedgerSaveVars,
} from '#/features/ledger/form-state'

export type { LedgerFormState, LedgerSaveVars }
export {
  emptyLedgerForm,
  formFromTransaction,
  formFromTransferLeg,
  transactionMeta,
  transferBadgeClass,
}

interface UseLedgerFormArgs {
  listQueryKey: ReturnType<typeof queryKeys.transactionsList>
  viewingMonth: string | null
  filteredCategories: { id: string; name: string }[]
  methods: { id: string; name: string }[]
  settingsCurrency: string
  onFundOffer: (offer: FundGoalOffer) => void
  editing: LedgerTransaction | null
  form: LedgerFormState
  setForm: (fn: (current: LedgerFormState) => LedgerFormState) => void
  setSaveError: (error: string | null) => void
  setComposerOpen: (open: boolean) => void
  reset: () => void
}

export function useLedgerForm({
  listQueryKey,
  viewingMonth,
  filteredCategories,
  methods,
  settingsCurrency,
  onFundOffer,
  editing,
  form,
  setForm,
  setSaveError,
  setComposerOpen,
  reset,
}: UseLedgerFormArgs) {
  const queryClient = useQueryClient()

  const saveMutation = useOptimisticMutation<
    LedgerTransaction[],
    LedgerSaveVars,
    { mode: 'edit' | 'create'; id: string }
  >({
    queryClient,
    queryKey: listQueryKey,
    invalidateKeys: ['transactions', 'accounts'],
    mutationFn: async (vars) => {
      const payload = {
        description: vars.description,
        amount: vars.amount,
        type: vars.type,
        date: vars.date,
        categoryId: vars.categoryId,
        paymentMethodId: vars.paymentMethodId,
      }
      if (vars.editingId) {
        await updateTransaction(vars.editingId, payload)
        return { mode: 'edit' as const, id: vars.editingId }
      }
      const row = await createTransaction(payload)
      return { mode: 'create' as const, id: row.id }
    },
    onMutate: (vars) => {
      setSaveError(null)

      const nextRow: LedgerTransaction = {
        id: vars.editingId ?? `temp-${crypto.randomUUID()}`,
        description: vars.description,
        amount: vars.amount,
        type: vars.type,
        date: vars.date,
        categoryId: vars.categoryId,
        category: vars.categoryName,
        paymentMethodId: vars.paymentMethodId,
        paymentMethod: vars.paymentMethodName,
        accountId: vars.paymentMethodId,
        account: vars.paymentMethodName,
        sourceRecurringId: null,
        transferId: null,
        transferDirection: null,
      }

      queryClient.setQueryData<LedgerTransaction[]>(listQueryKey, (current) => {
        const list = current ?? []
        if (vars.editingId) {
          return list.map((row) => (row.id === vars.editingId ? nextRow : row))
        }
        return [nextRow, ...list]
      })

      rememberTransactionDefaults({
        type: vars.type,
        categoryId: vars.categoryId,
        paymentMethodId: vars.paymentMethodId ?? '',
      })

      reset()

      return { tempId: vars.editingId ? null : nextRow.id }
    },
    onSuccess: (result, vars, context) => {
      if (result.mode === 'create' && context?.tempId) {
        queryClient.setQueryData<LedgerTransaction[]>(listQueryKey, (current) =>
          current?.map((row) =>
            row.id === context.tempId ? { ...row, id: result.id } : row,
          ),
        )
      }
      if (result.mode === 'create' && vars.type === 'income') {
        const cachedGoals = queryClient.getQueryData<SavingsGoalRow[]>(
          queryKeys.savingsGoals,
        )
        if (cachedGoals && shouldPromptFundGoal(cachedGoals)) {
          onFundOffer({
            amount: vars.amount,
            categoryId: vars.categoryId,
            currency: settingsCurrency,
            description: vars.description,
          })
        }
      }
      if (result.mode === 'create') {
        const cached =
          queryClient.getQueryData<LedgerTransaction[]>(listQueryKey)
        const dupe = cached
          ? findPossibleDuplicate(cached, {
              description: vars.description,
              amount: vars.amount,
              date: vars.date,
              type: vars.type,
            })
          : null
        if (dupe) {
          void import('sonner').then(({ toast }) => {
            toast.info(
              `Looks like a duplicate of “${dupe.description}” from ${formatIsoDate(dupe.date)}`,
            )
          })
        }
      }
    },
    onError: makeMutationErrorHandler(
      setSaveError,
      'Could not save transaction',
      { reopenDialog: () => setComposerOpen(true) },
    ),
  })

  const deleteMutation = useOptimisticMutation<LedgerTransaction[], string>({
    queryClient,
    queryKey: listQueryKey,
    invalidateKeys: ['transactions', 'accounts', 'transfers'],
    mutationFn: async (id) => {
      await deleteTransaction(id)
    },
    onMutate: (id) => {
      queryClient.setQueryData<LedgerTransaction[]>(listQueryKey, (current) => {
        const peerId = current?.find((row) => row.id === id)?.transferId
        return current?.filter((row) => row.id !== id && row.id !== peerId)
      })
    },
  })

  const transferMutation = useOptimisticMutation<
    LedgerTransaction[],
    {
      editingId: string | null
      fromAccountId: string
      toAccountId: string
      amount: number
      date: string
      description?: string
    }
  >({
    queryClient,
    queryKey: listQueryKey,
    invalidateKeys: ['transfers', 'transactions', 'accounts'],
    mutationFn: async (vars) => {
      if (vars.editingId) {
        await updateTransfer(vars.editingId, {
          fromAccountId: vars.fromAccountId,
          toAccountId: vars.toAccountId,
          amount: vars.amount,
          date: vars.date,
          description: vars.description,
        })
        return
      }
      await createTransfer({
        fromAccountId: vars.fromAccountId,
        toAccountId: vars.toAccountId,
        amount: vars.amount,
        date: vars.date,
        description: vars.description,
      })
    },
    onMutate: () => {
      setSaveError(null)
      reset()
    },
    onError: makeMutationErrorHandler(setSaveError, 'Could not save transfer', {
      reopenDialog: () => setComposerOpen(true),
    }),
  })

  function openCreateInContext() {
    reset()
    const sole = soleAccountId(methods)
    setForm((current) => ({
      ...current,
      date: defaultDateForMonth(viewingMonth ?? undefined),
      paymentMethodId: sole ?? current.paymentMethodId,
    }))
    setComposerOpen(true)
  }

  function openDuplicate(tx: LedgerTransaction) {
    reset()
    if (tx.type === 'transfer') {
      void (async () => {
        const base = await formFromTransferLeg(tx)
        setForm(() => ({
          ...base,
          date: todayIso(),
        }))
        setComposerOpen(true)
      })()
      return
    }
    setForm(() => ({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      categoryId: tx.categoryId ?? '',
      paymentMethodId: tx.paymentMethodId ?? '',
      fromAccountId: '',
      toAccountId: '',
      date: todayIso(),
    }))
    setComposerOpen(true)
  }

  function submitForm() {
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setSaveError('Enter a valid amount greater than 0')
      return
    }

    if (form.type === 'transfer') {
      if (!form.fromAccountId || !form.toAccountId) {
        setSaveError('Choose from and to accounts')
        return
      }
      if (form.fromAccountId === form.toAccountId) {
        setSaveError('Choose two different accounts')
        return
      }
      transferMutation.mutate({
        editingId: editing?.id ?? null,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount,
        date: form.date || todayIso(),
        description: form.description.trim() || undefined,
      })
      return
    }

    if (!form.description.trim()) {
      setSaveError('Enter a description and a valid amount')
      return
    }
    if (!form.categoryId) {
      setSaveError('Choose a category')
      return
    }
    const category = filteredCategories.find(
      (item) => item.id === form.categoryId,
    )
    const method = methods.find((item) => item.id === form.paymentMethodId)
    saveMutation.mutate({
      editingId: editing?.id ?? null,
      description: form.description.trim(),
      amount,
      type: form.type,
      date: form.date || todayIso(),
      categoryId: form.categoryId,
      categoryName: category?.name ?? 'Category',
      paymentMethodId: form.paymentMethodId || null,
      paymentMethodName: method?.name ?? null,
    })
  }

  const isSubmitting =
    saveMutation.isPending ||
    deleteMutation.isPending ||
    transferMutation.isPending

  return {
    saveMutation,
    deleteMutation,
    transferMutation,
    openCreateInContext,
    openDuplicate,
    submitForm,
    isSubmitting,
  }
}
