import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CreditCard, Plus } from 'lucide-react'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { TableEmptyRow } from '#/components/layout/page-shell'
import { MobileListRow } from '#/components/layout/mobile-list'
import { RowActionsMenu } from '#/components/row-actions-menu'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { ComposerFormModal } from '#/components/composer-form-modal'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethodsWithUsage,
  updatePaymentMethod,
} from '#/data/repository'
import { makeMutationErrorHandler } from '#/lib/errors'
import { useComposer } from '#/hooks/use-composer'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { PaymentMethodRow } from '#/lib/types'

type FormState = { name: string }

const emptyForm = (): FormState => ({ name: '' })

export function PaymentMethodsPanel() {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<PaymentMethodRow | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const {
    editing,
    form,
    composerOpen,
    setForm,
    openCreate,
    openEdit,
    reset,
    bindOpenChange,
  } = useComposer<FormState, PaymentMethodRow>({
    emptyForm,
    formFromRow: (row) => ({ name: row.name }),
  })

  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethodsUsage,
    queryFn: listPaymentMethodsWithUsage,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Enter a payment method name')
      if (editing) {
        await updatePaymentMethod(editing.id, { name: form.name })
      } else {
        await createPaymentMethod({ name: form.name })
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['paymentMethods', 'transactions'])
      reset()
    },
    onError: makeMutationErrorHandler(
      setSaveError,
      'Could not save',
    ),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No method selected')
      await deletePaymentMethod(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['paymentMethods', 'transactions'])
      setDeleting(null)
    },
  })

  const rows = methodsQuery.data ?? []
  const emptyMethods = (
    <EmptyState
      compact
      icon={<CreditCard />}
      title="No payment methods"
      description="Optional — bills work without them."
    />
  )

  function handleOpenCreate() {
    saveMutation.reset()
    openCreate()
  }

  function handleOpenEdit(row: PaymentMethodRow) {
    saveMutation.reset()
    openEdit(row)
  }

  return (
    <>
      <Card className="shrink-0 gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">Payment methods</CardTitle>
          <CardDescription>
            Labels for ledger and bill payments.
          </CardDescription>
          <div className="pt-1">
            <ComposerFormModal
              open={composerOpen}
              onOpenChange={bindOpenChange(() => saveMutation.reset())}
              trigger={
                <Button size="sm" onClick={handleOpenCreate}>
                  <Plus data-icon="inline-start" />
                  Add method
                </Button>
              }
              title={editing ? 'Edit method' : 'Add method'}
              description="Cash, card, or similar."
              pending={saveMutation.isPending}
              error={saveError}
              onSubmit={() => saveMutation.mutate()}
            >
              <FieldGroup className="gap-4 py-2">
                <Field>
                  <FieldLabel htmlFor="method-name">Name</FieldLabel>
                  <Input
                    id="method-name"
                    name="name"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Debit card…"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </Field>
              </FieldGroup>
            </ComposerFormModal>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-1">
          <VirtualizedDataList
            layout="flow"
            items={rows}
            getItemKey={(row) => row.id}
            mobileEstimateSize={72}
            desktopEstimateSize={48}
            colSpan={4}
            mobileClassName="px-3 py-2"
            empty={emptyMethods}
            desktopEmpty={
              <TableEmptyRow colSpan={4}>{emptyMethods}</TableEmptyRow>
            }
            header={
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
            }
            renderMobile={(method) => (
              <MobileListRow
                key={method.id}
                title={method.name}
                meta={
                  <>
                    {method.transactionCount > 0 ? (
                      <Link
                        to="/ledger"
                        search={{ method: method.id }}
                        className="underline-offset-2 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {method.transactionCount} transaction
                        {method.transactionCount === 1 ? '' : 's'}
                      </Link>
                    ) : (
                      <>0 transactions</>
                    )}
                    {method.recurringCount ? (
                      <>
                        {' '}
                        · {method.recurringCount} bill
                        {method.recurringCount === 1 ? '' : 's'}
                      </>
                    ) : null}
                  </>
                }
                onClick={() => handleOpenEdit(method)}
                actions={
                  <RowActionsMenu
                    label={method.name}
                    size="touch"
                    onEdit={() => handleOpenEdit(method)}
                    onDelete={() => {
                      deleteMutation.reset()
                      setDeleting(method)
                    }}
                  />
                }
              />
            )}
            renderDesktop={(method) => (
              <TableRow key={method.id}>
                <TableCell className="font-medium">{method.name}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {method.transactionCount > 0 ? (
                    <Link
                      to="/ledger"
                      search={{ method: method.id }}
                      className="underline-offset-2 hover:underline"
                    >
                      {method.transactionCount}
                    </Link>
                  ) : (
                    method.transactionCount
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {method.recurringCount}
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    label={method.name}
                    onEdit={() => handleOpenEdit(method)}
                    onDelete={() => {
                      deleteMutation.reset()
                      setDeleting(method)
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
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
        title={`Delete “${deleting?.name ?? 'method'}”?`}
        description={
          (deleting?.transactionCount ?? 0) > 0 ||
          (deleting?.recurringCount ?? 0) > 0
            ? `Used by ${deleting?.transactionCount ?? 0} transaction${(deleting?.transactionCount ?? 0) === 1 ? '' : 's'} and ${deleting?.recurringCount ?? 0} bill${(deleting?.recurringCount ?? 0) === 1 ? '' : 's'}. Method label will be cleared.`
            : 'This cannot be undone.'
        }
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}
