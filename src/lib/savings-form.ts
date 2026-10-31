import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SavingsGoalRow } from '#/lib/types'
import {
  createSavingsGoal,
  updateSavingsGoal,
  recordSavingsContribution,
} from '#/data/repository'
import { invalidateAfter } from '#/lib/query/invalidation'
import { savingsRemaining } from '#/lib/savings'

/** Savings goal form state. */
export type SavingsFormState = {
  name: string
  targetAmount: string
  currentAmount: string
  targetDate: string
  categoryId: string
}

/** Default empty form for creating a new goal. */
export function emptySavingsForm(): SavingsFormState {
  return {
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    categoryId: '',
  }
}

/** Transform a goal row into form state for editing. */
export function formFromGoal(goal: SavingsGoalRow): SavingsFormState {
  return {
    name: goal.name,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    targetDate: goal.targetDate ?? '',
    categoryId: goal.categoryId ?? '',
  }
}

interface UseSavingsFormArgs {
  onClose: () => void
  editing: SavingsGoalRow | null
  form: {
    name: string
    targetAmount: string
    currentAmount: string
    targetDate: string
    categoryId: string
  }
  setForm: React.Dispatch<React.SetStateAction<{
    name: string
    targetAmount: string
    currentAmount: string
    targetDate: string
    categoryId: string
  }>>
  setComposerOpen: (open: boolean) => void
  reset: () => void
}

export function useSavingsForm({
  onClose,
  editing,
  form,
  setForm,
  setComposerOpen,
  reset,
}: UseSavingsFormArgs) {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async () => {
      await createSavingsGoal({
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currentAmount: form.currentAmount ? Number(form.currentAmount) : 0,
        targetDate: form.targetDate || null,
        categoryId: form.categoryId || null,
      })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['savingsGoals'])
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('No goal selected')
      await updateSavingsGoal(editing.id, {
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
        targetDate: form.targetDate || null,
        categoryId: form.categoryId || null,
      })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['savingsGoals'])
      onClose()
    },
  })

  const contributeMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      await recordSavingsContribution(id, amount)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['savingsGoals'])
    },
  })

  function openCreate() {
    reset()
    setComposerOpen(true)
  }

  function openEdit(goal: SavingsGoalRow) {
    setForm(formFromGoal(goal))
    setComposerOpen(true)
  }

  function handleSubmit() {
    const targetAmount = Number(form.targetAmount)
    if (!form.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return
    }
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  function handleContribute(goal: SavingsGoalRow) {
    const amount = savingsRemaining(goal)
    if (amount > 0) {
      contributeMutation.mutate({ id: goal.id, amount })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending || contributeMutation.isPending

  return {
    createMutation,
    updateMutation,
    contributeMutation,
    openCreate,
    openEdit,
    handleSubmit,
    handleContribute,
    formFromGoal,
    isSubmitting,
  }
}