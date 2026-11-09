import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SavingsGoalRow } from '#/lib/types'
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  recordSavingsContribution,
} from '#/data/repository'
import { invalidateAfter } from '#/lib/query/invalidation'
import { savingsRemaining } from '#/lib/savings'

export type SavingsFormState = {
  name: string
  targetAmount: string
  currentAmount: string
  targetDate: string
  categoryId: string
}

export function emptySavingsForm(): SavingsFormState {
  return {
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    categoryId: '',
  }
}

function formFromGoal(goal: SavingsGoalRow): SavingsFormState {
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
  deleting: SavingsGoalRow | null
  form: {
    name: string
    targetAmount: string
    currentAmount: string
    targetDate: string
    categoryId: string
  }
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string
      targetAmount: string
      currentAmount: string
      targetDate: string
      categoryId: string
    }>
  >
  setComposerOpen: (open: boolean) => void
  setEditing: (goal: SavingsGoalRow | null) => void
  setDeleting: (goal: SavingsGoalRow | null) => void
  reset: () => void
}

export function useSavingsForm({
  onClose,
  editing,
  deleting,
  form,
  setForm,
  setComposerOpen,
  setEditing,
  setDeleting,
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No goal selected')
      await deleteSavingsGoal(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['savingsGoals'])
      setDeleting(null)
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
    setEditing(goal)
    setForm(formFromGoal(goal))
    setComposerOpen(true)
  }

  function handleSubmit() {
    const targetAmount = Number(form.targetAmount)
    if (
      !form.name.trim() ||
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
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

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    contributeMutation.isPending

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    contributeMutation,
    openCreate,
    openEdit,
    handleSubmit,
    handleContribute,
    isSubmitting,
  }
}
