import { useEffect, useMemo, useState } from 'react'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import { Plus, Target } from 'lucide-react'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { ConfirmDeleteDialog } from '#/features/shared/confirm-delete-dialog'
import { ContributeProgressDialog } from '#/features/savings/contribute-progress-dialog'
import { GoalDetailSheet } from '#/features/savings/goal-detail-sheet'
import { CategorySelect } from '#/features/shared/entity-selects'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import {
  CompletedGoalRow,
  SavingsGoalCard,
} from '#/features/savings/savings-goal-card'
import { motion } from '#/lib/motion'
import type { SavingsGoalRow } from '#/lib/types'
import { useSavingsList } from '#/lib/savings-list'
import { useSavingsForm, emptySavingsForm } from '#/lib/savings-form'

const routeApi = getRouteApi('/savings')

export function SavingsScreen() {
  const navigate = useNavigate({ from: '/savings' })
  const { new: openNew } = routeApi.useSearch()
  const {
    goals,
    activeGoals,
    completedGoals,
    currency,
    incomeCategories,
    isLoading,
    isError,
    errorMessage,
    retry,
  } = useSavingsList()

  const [editing, setEditing] = useState<SavingsGoalRow | null>(null)
  const [deleting, setDeleting] = useState<SavingsGoalRow | null>(null)
  const [contributing, setContributing] = useState<SavingsGoalRow | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState(emptySavingsForm())
  const [composerOpen, setComposerOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const detailItem = useMemo(
    () => (detailId ? (goals.find((goal) => goal.id === detailId) ?? null) : null),
    [detailId, goals],
  )
  const detailCompleted = Boolean(
    detailItem && completedGoals.some((goal) => goal.id === detailItem.id),
  )

  function reset() {
    setEditing(null)
    setComposerOpen(false)
    setForm(emptySavingsForm())
    setSaveError(null)
  }

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    openCreate,
    openEdit,
  } = useSavingsForm({
    onClose: reset,
    editing,
    deleting,
    form,
    setForm,
    setComposerOpen,
    setEditing,
    setDeleting,
    reset,
  })

  useEffect(() => {
    if (!openNew) return
    let cancelled = false
    void (async () => {
      void motion.openOverlay('modal')
      if (cancelled) {
        motion.closeOverlay('modal')
        return
      }
      openCreate()
      void navigate({ search: {}, replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [openNew])

  function handleSubmit() {
    const targetAmount = Number(form.targetAmount)
    if (!form.name.trim()) {
      setSaveError('Enter a goal name')
      return
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setSaveError('Enter a target amount greater than 0')
      return
    }
    setSaveError(null)
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  if (isLoading) {
    return <PageLoading label="Loading savings goals…" variant="savings" />
  }

  if (isError) {
    return (
      <PageError
        title="Could not load goals"
        message={errorMessage}
        onRetry={retry}
      />
    )
  }

  return (
    <PageShell scroll="page">
      <PageHeader
        title="Goals"
        description="Savings targets you are working toward, plus optional deadlines."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Add goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target />}
          title="No savings goals yet"
          description={
            <>
              <p className="mb-2">Set a target amount and optional deadline.</p>
              <p className="text-xs text-muted-foreground">
                Link an income category to get prompted when you record matching
                income.
              </p>
            </>
          }
          action={
            <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
              <Plus data-icon="inline-start" />
              Add goal
            </Button>
          }
        />
      ) : (
        <>
          {activeGoals.length > 0 ? (
            <div className="space-y-3">
              {activeGoals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  currency={currency}
                  onOpen={(row) => setDetailId(row.id)}
                />
              ))}
            </div>
          ) : null}
          {completedGoals.length > 0 ? (
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <CompletedGoalRow
                  key={goal.id}
                  goal={goal}
                  onOpen={(row) => setDetailId(row.id)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      <GoalDetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        currency={currency}
        completed={detailCompleted}
        onContribute={setContributing}
        onEdit={openEdit}
        onDelete={(goal) => {
          deleteMutation.reset()
          setDeleting(goal)
        }}
      />

      <ComposerFormModal
        open={composerOpen}
        onOpenChange={(next) => {
          if (!next) {
            reset()
            createMutation.reset()
            updateMutation.reset()
          } else {
            setComposerOpen(true)
          }
        }}
        title={editing ? 'Edit savings goal' : 'Add savings goal'}
        description="Set a target amount and optional deadline. Link an income category to get prompted when you record matching income."
        pending={createMutation.isPending || updateMutation.isPending}
        error={
          saveError ??
          createMutation.error?.message ??
          updateMutation.error?.message ??
          null
        }
        onSubmit={handleSubmit}
      >
        <FieldGroup className="gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="goal-name">Name</FieldLabel>
            <Input
              id="goal-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Emergency fund…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="goal-target">Target amount</FieldLabel>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) =>
                  setForm({ ...form, targetAmount: e.target.value })
                }
                placeholder="1000.00"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-current">Current amount</FieldLabel>
              <Input
                id="goal-current"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={(e) =>
                  setForm({ ...form, currentAmount: e.target.value })
                }
                placeholder="0.00"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="goal-date">Target date (optional)</FieldLabel>
            <Input
              id="goal-date"
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-category">
              Income category (optional)
            </FieldLabel>
            <CategorySelect
              id="goal-category"
              value={form.categoryId}
              options={incomeCategories}
              placeholder="Any income"
              onValueChange={(categoryId) => setForm({ ...form, categoryId })}
            />
          </Field>
        </FieldGroup>
      </ComposerFormModal>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.name ?? 'goal'}”?`}
        description="This savings goal will be removed. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ContributeProgressDialog
        goal={contributing}
        currency={currency}
        onOpenChange={(open) => {
          if (!open) setContributing(null)
        }}
      />
    </PageShell>
  )
}
