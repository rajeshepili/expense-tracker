import { createFileRoute } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { ComposerFormModal } from '#/components/composer-form-modal'
import { AnimatedMoney } from '#/components/animated-number'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { FundGoalDialog } from '#/components/fund-goal-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { MonthNav } from '#/components/layout/month-nav'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { LedgerFilters } from '#/components/ledger/ledger-filters'
import { LedgerFormFields } from '#/components/ledger/ledger-form-fields'
import { LedgerLists } from '#/components/ledger/ledger-lists'
import { Kbd } from '#/components/ui/kbd'
import { useLedgerPage } from '#/hooks/use-ledger-page'
import type { LedgerSearch } from '#/lib/types'
import { formatYearMonth, isYearMonth } from '#/lib/finance'

export const Route = createFileRoute('/ledger')({
  validateSearch: (search: Record<string, unknown>): LedgerSearch => {
    const monthRaw = typeof search.month === 'string' ? search.month : undefined
    const month =
      monthRaw === 'all' || (monthRaw && isYearMonth(monthRaw))
        ? monthRaw
        : undefined
    return {
      new: search.new === true || search.new === '1' || search.new === 1,
      edit: typeof search.edit === 'string' ? search.edit : undefined,
      month,
      category:
        typeof search.category === 'string' ? search.category : undefined,
      method: typeof search.method === 'string' ? search.method : undefined,
      q: typeof search.q === 'string' ? search.q : undefined,
    }
  },
  component: LedgerPage,
})

function LedgerPage() {
  const ledger = useLedgerPage({
    search: Route.useSearch(),
    navigate: Route.useNavigate(),
  })

  if (ledger.status === 'loading') {
    return <PageLoading label="Loading ledger…" />
  }

  if (ledger.status === 'error') {
    return (
      <PageError
        title="Could not load ledger"
        message={ledger.message}
        onRetry={ledger.retry}
      />
    )
  }

  const {
    descriptionRef, filter, setFilter, query, setQuery,
    fundOffer, setFundOffer,
    editing, form, saveError, composerOpen, setForm,
    openEdit, bindOpenChange,
    monthFilter, categoryFilter, methodFilter, viewingMonth,
    categories, methods, filteredCategories, rows, totals, currency,
    listMode, filterChips,
    saveMutation, deleteMutation, openCreateInContext, openDuplicate,
    goMonth, clearFilters, setSearchFilter, filterByMethod, setType,
    submitForm, askDelete, deleting, setDeleting,
  } = ledger

  const emptyLedger = (
    <EmptyState
      icon={<Receipt />}
      title={
        viewingMonth
          ? `No transactions in ${formatYearMonth(viewingMonth)}`
          : 'Your ledger is empty'
      }
      description={
        <>
          <p className="mb-2">
            Add your first expense or income to start tracking.
          </p>
          <p className="text-xs text-muted-foreground">
            Tap <Kbd className="mx-1">N</Kbd> or the button below to begin.
          </p>
        </>
      }
      action={
        <Button
          size="sm"
          onClick={openCreateInContext}
          className="w-full sm:w-auto"
        >
          <Plus data-icon="inline-start" />
          Add Transaction
          <Kbd primary className="ml-1.5">
            N
          </Kbd>
        </Button>
      }
    />
  )
  const emptyFiltered = (
    <EmptyState
      compact
      title="No matching transactions"
      description={
        <>
          <p className="mb-2">Try adjusting your filters or search.</p>
          <p className="text-xs text-muted-foreground">
            Current filters:{' '}
            {filterChips.length > 0
              ? filterChips.map((c) => c.label).join(', ')
              : 'none'}
          </p>
        </>
      }
      action={
        <Button size="sm" variant="outline" onClick={clearFilters}>
          Clear all filters
        </Button>
      }
    />
  )

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        description={
          <MonthNav monthFilter={monthFilter} viewingMonth={viewingMonth} onGoMonth={goMonth} />
        }
        actions={
          <ComposerFormModal
            open={composerOpen}
            onOpenChange={bindOpenChange(() => saveMutation.reset())}
            trigger={
              <Button size="sm" onClick={openCreateInContext}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add transaction</span>
                <Kbd primary className="ml-1.5">
                  N
                </Kbd>
              </Button>
            }
            title={editing ? 'Edit transaction' : 'Add transaction'}
            description="Saved on this device."
            pending={saveMutation.isPending}
            error={saveError}
            onSubmit={submitForm}
          >
            <LedgerFormFields
              form={form}
              setForm={setForm}
              setType={setType}
              categories={filteredCategories}
              methods={methods}
              descriptionRef={descriptionRef}
            />
          </ComposerFormModal>
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} ·{' '}
            <AnimatedMoney
              amount={totals.expenses}
              currency={currency}
              showDelta={false}
            />{' '}
            spent ·{' '}
            <AnimatedMoney
              amount={totals.income}
              currency={currency}
              showDelta={false}
            />{' '}
            income
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <LedgerFilters
            filter={filter}
            onFilterChange={setFilter}
            query={query}
            onQueryChange={setQuery}
            categoryFilter={categoryFilter}
            methodFilter={methodFilter}
            categories={categories}
            methods={methods}
            onCategoryChange={(category) => setSearchFilter({ category })}
            onMethodChange={(method) => setSearchFilter({ method })}
            chips={filterChips}
            onClearFilters={clearFilters}
          />
          <LedgerLists
            rows={rows}
            listMode={listMode}
            currency={currency}
            emptyLedger={emptyLedger}
            emptyFiltered={emptyFiltered}
            onEdit={openEdit}
            onDuplicate={openDuplicate}
            onDelete={askDelete}
            onFilterByMethod={filterByMethod}
          />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.description ?? 'transaction'}”?`}
        description="This transaction will be removed. This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => {
          if (!deleting) return
          deleteMutation.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
          })
        }}
      />

      <FundGoalDialog
        offer={fundOffer}
        onOpenChange={(open) => {
          if (!open) setFundOffer(null)
        }}
      />
    </PageShell>
  )
}
