import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Target, ArrowRight } from 'lucide-react'
import { ComposerFormModal } from '#/components/composer-form-modal'
import { CategorySelect } from '#/components/entity-selects'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { CompletedGoalRow, SavingsGoalCard } from '#/components/savings-goal-card'
import type { SavingsGoalRow } from '#/lib/types'
import { useSavingsList } from '#/lib/savings-list'
import { useSavingsForm, emptySavingsForm } from '#/lib/savings-form'

export const Route = createFileRoute('/savings')({
  component: SavingsPage,
})

function SavingsPage() {
  const {
    goals,
    activeGoals,
    completedGoals,
    currency,
    incomeCategories,
    isLoading,
    isError,
  } = useSavingsList()

  const [editing, setEditing] = useState<SavingsGoalRow | null>(null)
  const [form, setForm] = useState(emptySavingsForm())
  const [composerOpen, setComposerOpen] = useState(false)

  function reset() {
    setEditing(null)
    setComposerOpen(false)
    setForm(emptySavingsForm())
  }

  const {
    createMutation,
    updateMutation,
    handleContribute,
    openCreate,
    openEdit,
  } = useSavingsForm({
    onClose: reset,
    editing,
    form,
    setForm,
    setComposerOpen,
    reset,
  })

  function handleSubmit() {
    const targetAmount = Number(form.targetAmount)
    if (!form.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return
    }
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  if (isLoading) {
    return <PageLoading label="Loading savings goals…" />
  }

  if (isError) {
    return <PageError title="Could not load savings goals" />
  }

  return (
    <PageShell scroll="page">
      <PageHeader
        title="Savings goals"
        description="Targets you are working toward, plus optional deadlines."
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
                Link an income category to get prompted when you record matching income.
              </p>
            </>
          }
          action={
            <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
              <Plus data-icon="inline-start" />
              Add Goal
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
                  actions={
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleContribute(goal)}
                      >
                        Add progress
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => openEdit(goal)}
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  }
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
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(goal)}
                    >
                      <ArrowRight className="size-4" />
                    </Button>
                  }
                />
              ))}
            </div>
          ) : null}
        </>
      )}

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
              onChange={(e) =>
                setForm({ ...form, targetDate: e.target.value })
              }
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
              onValueChange={(categoryId) =>
                setForm({ ...form, categoryId })
              }
            />
          </Field>
        </FieldGroup>
      </ComposerFormModal>
    </PageShell>
  )
}