import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Kbd } from '#/components/ui/kbd'
import { Progress } from '#/components/ui/progress'
import { ComposerFormModal } from '#/components/composer-form-modal'
import { AnimatedMoney, AnimatedPercent } from '#/components/animated-number'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { RecordRecurringControls } from '#/components/record-recurring-controls'
import { RecurringLists } from '#/components/recurring/recurring-lists'
import { RecurringFormFields } from '#/components/recurring/recurring-form-fields'
import { listTransactionsForRecurring } from '#/data/repository'
import { useComposer } from '#/hooks/use-composer'
import { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  formatIsoDate,
  money,
  monthlyEquivalent,
} from '#/lib/finance'
import { SignedMoney } from '#/components/signed-money'
import { queryKeys } from '#/lib/query/keys'
import type { RecurringFormState } from '#/lib/recurring-form'
import type { RecurringExpenseRow } from '#/lib/types'
import { useRecurringList } from '#/lib/recurring-list'
import { emptyRecurringForm, formFromRecurringRow, useRecurringForm } from '#/lib/recurring-form'

export const Route = createFileRoute('/recurring')({
  component: RecurringPage,
})

function RecurringPage() {
  const recorder = useRecordRecurring()
  const [deleting, setDeleting] = useState<RecurringExpenseRow | null>(null)
  const [viewPayments, setViewPayments] = useState<RecurringExpenseRow | null>(null)
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
    paymentMethods,
    isLoading,
    isError,
    errorMessage,
    retry,
  } = useRecurringList()

  const {
    saveMutation,
    toggleMutation,
    deleteMutation,
    openCreate,
    openEdit,
  } = useRecurringForm({
    onClose: reset,
    editing,
    form,
    setForm,
    setComposerOpen,
    reset,
    setSaveError,
    setDeleting,
    deleting,
  })

  const monthlyTotal = useMemo(
    () =>
      items
        .filter((item) => item.active)
        .reduce(
          (sum, item) => sum + monthlyEquivalent(item.amount, item.cadence),
          0,
        ),
    [items],
  )
  const ofBudget = monthlyBudget > 0 ? monthlyTotal / monthlyBudget : 0

  const viewPaymentsQuery = useQuery({
    queryKey: viewPayments
      ? queryKeys.recurringTransactions(viewPayments.id)
      : ['recurring', 'transactions', 'none'],
    queryFn: () => (viewPayments ? listTransactionsForRecurring(viewPayments.id) : []),
    enabled: Boolean(viewPayments),
  })

  const [skipConfirm, setSkipConfirm] = useState<RecurringExpenseRow | null>(null)

  if (isLoading) {
    return <PageLoading label="Loading recurring…" />
  }

  if (isError) {
    return (
      <PageError
        title="Could not load recurring expenses"
        message={errorMessage}
        onRetry={retry}
      />
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Recurring"
        description="Bills and subscriptions that hit every cycle."
        actions={
          <ComposerFormModal
            open={composerOpen}
            onOpenChange={bindOpenChange(() => saveMutation.reset())}
            trigger={
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add recurring</span>
                <Kbd primary className="ml-1.5">N</Kbd>
              </Button>
            }
            title={
              editing ? 'Edit recurring expense' : 'Add recurring expense'
            }
            description="Saved on this device."
            pending={saveMutation.isPending}
            error={saveError}
            onSubmit={() => saveMutation.mutate()}
          >
            <RecurringFormFields
              form={form}
              setForm={setForm}
              categories={expenseCategories}
              paymentMethods={paymentMethods}
            />
          </ComposerFormModal>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-2 md:gap-3">
        <div className="rounded-lg border bg-card px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Active monthly load
          </p>
          <AnimatedMoney
            persistKey="recurring:monthly-total"
            amount={monthlyTotal}
            currency={currency}
            goodWhen="down"
            className="mt-1 text-lg font-semibold tracking-tight md:text-xl"
          />
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            From weekly / monthly / yearly cadences
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5 md:px-4 md:py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Of this month's budget
          </p>
          <AnimatedPercent
            persistKey="recurring:of-budget"
            value={ofBudget}
            goodWhen="down"
            className="mt-1 text-lg font-semibold tracking-tight md:text-xl"
          />
          <Progress
            className="mt-2 h-1.5"
            value={Math.min(ofBudget * 100, 100)}
            aria-label="Recurring share of budget"
          />
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            of {money(monthlyBudget, currency)} this month
          </p>
        </div>
      </section>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Recurring expenses</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-1">
          <RecurringLists
            items={items}
            currency={currency}
            monthlyBudget={monthlyBudget}
            recording={recorder.recording}
            togglePending={toggleMutation.isPending}
            recorder={recorder}
            onToggle={(id, active) => toggleMutation.mutate({ id, active })}
            onEdit={openEdit}
            onCreate={openCreate}
            onSkip={setSkipConfirm}
            onViewPayments={setViewPayments}
            onDelete={(item) => {
              deleteMutation.reset()
              setDeleting(item)
            }}
          />
        </CardContent>
      </Card>

      <RecordRecurringControls
        recorder={recorder}
        paymentMethods={paymentMethods}
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

      {viewPayments && (
        <ComposerFormModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setViewPayments(null)
          }}
          title={`Payments for ${viewPayments.name}`}
          description={`${viewPaymentsQuery.data?.length ?? 0} linked transaction${viewPaymentsQuery.data?.length === 1 ? '' : 's'}`}
          pending={false}
          onSubmit={() => { }}
        >
          {viewPaymentsQuery.isPending ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              Loading…
            </div>
          ) : viewPaymentsQuery.data?.length === 0 ? (
            <EmptyState
              compact
              icon={<Receipt />}
              title="No payments yet"
              description={
                <>
                  <p className="mb-2">Record a payment to see it here.</p>
                  <p className="text-xs text-muted-foreground">
                    Open the row menu and tap <Kbd className="mx-1">Record</Kbd> or <Kbd className="mx-1">Skip</Kbd>.
                  </p>
                </>
              }
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {viewPaymentsQuery.data?.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category} · {formatIsoDate(tx.date)}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <SignedMoney
                      type={tx.type}
                      amount={tx.amount}
                      currency={currency}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
        </ComposerFormModal>
      )}
    </PageShell>
  )
}