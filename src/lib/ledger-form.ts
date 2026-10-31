import { useQueryClient } from '@tanstack/react-query'
import type { FundGoalOffer } from '#/components/fund-goal-dialog'
import type { LedgerTransaction, SavingsGoalRow, TransactionType } from '#/lib/types'
import { queryKeys } from '#/lib/query/keys'
import { createTransaction, updateTransaction, deleteTransaction } from '#/data/repository'
import { useOptimisticMutation } from '#/hooks/use-optimistic-mutation'
import { makeMutationErrorHandler } from '#/lib/errors'
import {
  defaultDateForMonth,
  todayIso,
} from '#/lib/finance'
import { rememberTransactionDefaults } from '#/lib/transaction-defaults'
import { shouldPromptFundGoal } from '#/lib/savings'

/** Ledger form state shared between composer and mutations. */
export type LedgerFormState = {
  description: string
  amount: string
  type: TransactionType
  categoryId: string
  paymentMethodId: string
  date: string
}

/** Variables passed to save mutation. */
export type LedgerSaveVars = {
  editingId: string | null
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: string
  categoryName: string
  paymentMethodId: string | null
  paymentMethodName: string | null
}

/** Default empty form for creating a new transaction. */
export function emptyLedgerForm(): LedgerFormState {
  return {
    description: '',
    amount: '',
    type: 'expense',
    categoryId: '',
    paymentMethodId: '',
    date: todayIso(),
  }
}

/** Transform a transaction row into form state for editing. */
export function formFromTransaction(tx: LedgerTransaction): LedgerFormState {
  return {
    description: tx.description,
    amount: String(tx.amount),
    type: tx.type,
    categoryId: tx.categoryId,
    paymentMethodId: tx.paymentMethodId ?? '',
    date: tx.date,
  }
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
    invalidateKeys: ['transactions', 'categories'],
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
        sourceRecurringId: null,
      }

      queryClient.setQueryData<LedgerTransaction[]>(listQueryKey, (current) => {
        const list = current ?? []
        if (vars.editingId) {
          return list.map((row) =>
            row.id === vars.editingId ? nextRow : row,
          )
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
        queryClient.setQueryData<LedgerTransaction[]>(
          listQueryKey,
          (current) =>
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
    invalidateKeys: ['transactions', 'categories'],
    mutationFn: async (id) => {
      await deleteTransaction(id)
    },
    onMutate: (id) => {
      queryClient.setQueryData<LedgerTransaction[]>(listQueryKey, (current) =>
        current?.filter((row) => row.id !== id),
      )
    },
  })

  function openCreateInContext() {
    reset()
    setForm((current) => ({
      ...current,
      date: defaultDateForMonth(viewingMonth ?? undefined),
    }))
    setComposerOpen(true)
  }

  function openDuplicate(tx: LedgerTransaction) {
    reset()
    setForm(() => ({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      categoryId: tx.categoryId,
      paymentMethodId: tx.paymentMethodId ?? '',
      date: todayIso(),
    }))
    setComposerOpen(true)
  }

  function submitForm() {
    const amount = Number(form.amount)
    if (!form.description.trim() || !Number.isFinite(amount) || amount < 0) {
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

  const isSubmitting = saveMutation.isPending || deleteMutation.isPending

  return {
    saveMutation,
    deleteMutation,
    openCreateInContext,
    openDuplicate,
    submitForm,
    isSubmitting,
  }
}

/** Format transaction metadata for mobile list display. */
export function transactionMeta(tx: LedgerTransaction): string {
  const parts: string[] = []
  if (tx.category) parts.push(tx.category)
  if (tx.paymentMethod) parts.push(tx.paymentMethod)
  return parts.join(' · ')
}