import { useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { ConfirmDeleteDialog } from '#/features/shared/confirm-delete-dialog'
import { FundGoalDialog } from '#/features/savings/fund-goal-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { MonthNav } from '#/components/layout/month-nav'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { LedgerFilters } from '#/features/ledger/ledger-filters'
import { LedgerFormFields } from '#/features/ledger/ledger-form-fields'
import { LedgerLists } from '#/features/ledger/ledger-lists'
import { TransactionDetailSheet } from '#/features/ledger/transaction-detail-sheet'
import { Kbd } from '#/components/ui/kbd'
import { useLedgerPage } from '#/hooks/use-ledger-page'
import { useIsMobile } from '#/hooks/use-media-query'
import { formatYearMonth, money } from '#/lib/finance'
import type { LedgerTransaction } from '#/lib/types'

const routeApi = getRouteApi('/ledger')

export function LedgerScreen() {
  const ledger = useLedgerPage({
    search: routeApi.useSearch(),
    navigate: routeApi.useNavigate(),
  })
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const rowsForDetail = ledger.status === 'ready' ? ledger.rows : []
  const detailItem = useMemo(
    () =>
      detailId
        ? (rowsForDetail.find((row) => row.id === detailId) ?? null)
        : null,
    [detailId, rowsForDetail],
  )

  if (ledger.status === 'loading') {
    return <PageLoading label="Loading ledger…" variant="ledger" />
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
    descriptionRef,
    filter,
    setFilter,
    query,
    setQuery,
    fundOffer,
    setFundOffer,
    editing,
    form,
    saveError,
    composerOpen,
    setForm,
    openEdit,
    bindOpenChange,
    monthFilter,
    categoryFilter,
    methodFilter,
    viewingMonth,
    categories,
    methods,
    filteredCategories,
    rows,
    totals,
    currency,
    monthFetching,
    listMode,
    hasMore,
    loadMore,
    totalCount,
    filterChips,
    saveMutation,
    deleteMutation,
    transferMutation,
    openCreateInContext,
    openDuplicate,
    goMonth,
    clearFilters,
    clearChip,
    setSearchFilter,
    filterByMethod,
    setType,
    submitForm,
    askDelete,
    deleting,
    setDeleting,
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
          <p className="hidden text-xs text-muted-foreground lg:block">
            Press <Kbd className="mx-1">N</Kbd> or use the button below to
            begin.
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
          <Kbd primary className="ml-1.5 hidden lg:inline-flex">
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

  const listSummary = (
    <>
      {rows.length}
      {hasMore ? '+' : ''} shown
      {totalCount > rows.length ? ` of ${totalCount}` : ''} ·{' '}
      <span className="tabular-nums">{money(totals.expenses, currency)}</span>{' '}
      spent ·{' '}
      <span className="tabular-nums">{money(totals.income, currency)}</span>{' '}
      income
    </>
  )

  const filtersAndList = (
    <>
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
        onClearChip={clearChip}
      />
      <LedgerLists
        rows={rows}
        listMode={listMode}
        currency={currency}
        emptyLedger={emptyLedger}
        emptyFiltered={emptyFiltered}
        onOpenDetail={(row: LedgerTransaction) => setDetailId(row.id)}
        onFilterByMethod={filterByMethod}
      />
      {hasMore ? (
        <div className="shrink-0 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={loadMore}
            disabled={monthFetching}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  )

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        description={
          <MonthNav
            monthFilter={monthFilter}
            viewingMonth={viewingMonth}
            onGoMonth={goMonth}
            fetching={monthFetching}
          />
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
                <Kbd primary className="ml-1.5 hidden lg:inline-flex">
                  N
                </Kbd>
              </Button>
            }
            title={
              form.type === 'transfer'
                ? editing
                  ? 'Edit transfer'
                  : 'Add transfer'
                : editing
                  ? 'Edit transaction'
                  : 'Add transaction'
            }
            description={
              form.type === 'transfer'
                ? 'Moves money between accounts. Both sides stay linked.'
                : 'Saved on this device.'
            }
            pending={saveMutation.isPending || transferMutation.isPending}
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

      {isMobile ? (
        <div
          className="month-view flex min-h-0 flex-1 flex-col gap-3"
          aria-busy={monthFetching || undefined}
        >
          <p className="shrink-0 text-xs text-muted-foreground">{listSummary}</p>
          <div className="flex min-h-0 flex-1 flex-col gap-3">{filtersAndList}</div>
        </div>
      ) : (
        <Card
          className="month-view flex min-h-0 flex-1 flex-col gap-0 py-0"
          aria-busy={monthFetching || undefined}
        >
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="text-base">Transactions</CardTitle>
            <CardDescription>{listSummary}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
            {filtersAndList}
          </CardContent>
        </Card>
      )}

      <TransactionDetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        currency={currency}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
        onDelete={askDelete}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={
          deleting?.type === 'transfer'
            ? `Delete transfer “${deleting.description}”?`
            : `Delete “${deleting?.description ?? 'transaction'}”?`
        }
        description={
          deleting?.type === 'transfer'
            ? 'Both linked transfer legs will be removed. This cannot be undone.'
            : 'This transaction will be removed. This cannot be undone.'
        }
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
