import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Kbd } from '#/components/ui/kbd'
import { Progress } from '#/components/ui/progress'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { ConfirmDeleteDialog } from '#/features/shared/confirm-delete-dialog'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { BillDetailSheet } from '#/features/recurring/bill-detail-sheet'
import { RecordRecurringControls } from '#/features/recurring/record-recurring-controls'
import { RecurringLists } from '#/features/recurring/recurring-lists'
import { RecurringFormFields } from '#/features/recurring/recurring-form-fields'
import { useComposer } from '#/hooks/use-composer'
import { useCreateHotkey } from '#/hooks/use-create-hotkey'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  money,
  monthlyEquivalent,
  partitionRecurringForMonth,
  percent,
} from '#/lib/finance'
import { motion } from '#/lib/motion'
import type { RecurringFormState } from '#/lib/recurring-form'
import type { RecurringExpenseRow } from '#/lib/types'
import { useRecurringList } from '#/lib/recurring-list'
import {
  emptyRecurringForm,
  formFromRecurringRow,
  useRecurringForm,
} from '#/lib/recurring-form'

export function RecurringScreen() {
  const recorder = useRecordRecurring()
  const [deleting, setDeleting] = useState<RecurringExpenseRow | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const {
    editing,
    form,
    composerOpen,
    setForm,
    setComposerOpen,
    reset,
    bindOpenChange,
  } = useComposer<RecurringFormState, RecurringExpenseRow>({
    emptyForm: emptyRecurringForm,
    formFromRow: formFromRecurringRow,
  })

  const {
    items,
    currency,
    monthlyBudget,
    expenseCategories,
    incomeCategories,
    accounts,
    isLoading,
    isError,
    errorMessage,
    retry,
  } = useRecurringList()

  const { saveMutation, toggleMutation, deleteMutation, openCreate, openEdit } =
    useRecurringForm({
      onClose: reset,
      editing,
      form,
      setForm,
      setComposerOpen,
      reset,
      setSaveError,
      setDeleting,
      deleting,
      accounts,
    })

  const monthlyTotal = useMemo(
    () =>
      items
        .filter((item) => item.active && item.kind === 'expense')
        .reduce(
          (sum, item) => sum + monthlyEquivalent(item.amount, item.cadence),
          0,
        ),
    [items],
  )
  const ofBudget = monthlyBudget > 0 ? monthlyTotal / monthlyBudget : 0
  const { thisMonth, later, paused } = useMemo(
    () => partitionRecurringForMonth(items),
    [items],
  )

  const detailItem = useMemo(
    () => (detailId ? (items.find((item) => item.id === detailId) ?? null) : null),
    [detailId, items],
  )

  const [skipConfirm, setSkipConfirm] = useState<RecurringExpenseRow | null>(
    null,
  )

  useCreateHotkey(
    openCreate,
    composerOpen ||
      Boolean(deleting) ||
      Boolean(detailId) ||
      Boolean(skipConfirm) ||
      !motion.can('hotkey'),
  )

  if (isLoading) {
    return <PageLoading label="Loading recurring…" variant="recurring" />
  }

  if (isError) {
    return (
      <PageError
        title="Could not load bills"
        message={errorMessage}
        onRetry={retry}
      />
    )
  }

  return (
    <PageShell scroll="page">
      <PageHeader
        title="Bills"
        description="Due this month, plus later and paused bills."
        actions={
          <ComposerFormModal
            open={composerOpen}
            onOpenChange={bindOpenChange(() => saveMutation.reset())}
            trigger={
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add bill</span>
                <Kbd primary className="ml-1.5">
                  N
                </Kbd>
              </Button>
            }
            title={editing ? 'Edit recurring expense' : 'Add recurring expense'}
            description="Saved on this device."
            pending={saveMutation.isPending}
            error={saveError}
            onSubmit={() => saveMutation.mutate()}
          >
            <RecurringFormFields
              form={form}
              setForm={setForm}
              categories={expenseCategories}
              incomeCategories={incomeCategories}
              accounts={accounts}
            />
          </ComposerFormModal>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-2 md:gap-3">
        <div className="rounded-xl border bg-card px-3.5 py-3 md:px-4 md:py-3.5">
          <p className="text-xs font-medium text-muted-foreground">
            Monthly load
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums md:text-xl">
            {money(monthlyTotal, currency)}
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            Across active bills
          </p>
        </div>
        <div className="rounded-xl border bg-card px-3.5 py-3 md:px-4 md:py-3.5">
          <p className="text-xs font-medium text-muted-foreground">
            Of this month's budget
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums md:text-xl">
            {percent(ofBudget)}
          </p>
          <Progress
            className="mt-2 h-1.5"
            value={Math.min(ofBudget * 100, 100)}
            aria-label="Recurring share of budget"
          />
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            of {money(monthlyBudget, currency)}
          </p>
        </div>
      </section>

      <RecurringLists
        thisMonth={thisMonth}
        later={later}
        paused={paused}
        currency={currency}
        recording={recorder.recording}
        recorder={recorder}
        onOpenDetail={(item) => setDetailId(item.id)}
        onCreate={openCreate}
      />

      <BillDetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        currency={currency}
        monthlyBudget={monthlyBudget}
        recording={recorder.recording}
        togglePending={toggleMutation.isPending}
        recorder={recorder}
        onToggle={(id, active) => toggleMutation.mutate({ id, active })}
        onEdit={openEdit}
        onSkip={setSkipConfirm}
        onDelete={(item) => {
          deleteMutation.reset()
          setDeleting(item)
        }}
      />

      <RecordRecurringControls
        recorder={recorder}
        accounts={accounts}
        currencyHint={currency}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.name ?? 'recurring item'}”?`}
        description="This recurring expense will be removed. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDeleteDialog
        open={Boolean(skipConfirm)}
        onOpenChange={(open) => {
          if (!open) setSkipConfirm(null)
        }}
        title={`Skip “${skipConfirm?.name ?? 'bill'}”?`}
        description="Advances the next date without a ledger entry."
        confirmLabel="Skip"
        pending={recorder.skipping}
        onConfirm={() => {
          if (!skipConfirm) return
          recorder.skip(skipConfirm.id)
          setSkipConfirm(null)
        }}
      />
    </PageShell>
  )
}
