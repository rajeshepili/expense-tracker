import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CreditCard, MoreHorizontal, Plus } from 'lucide-react'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileList, MobileListRow } from '#/components/layout/mobile-list'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '#/components/ui/responsive-modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethodsWithUsage,
  updatePaymentMethod,
} from '#/data/repository'
import { useComposer } from '#/hooks/use-composer'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { PaymentMethodRow } from '#/lib/types'

type FormState = { name: string }

const emptyForm = (): FormState => ({ name: '' })

export function PaymentMethodsPanel() {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<PaymentMethodRow | null>(null)
  const {
    editing,
    form,
    composerOpen,
    setForm,
    setComposerOpen,
    openCreate,
    openEdit,
    reset,
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
            <ResponsiveModal
              open={composerOpen}
              onOpenChange={(open) => {
                if (!open) {
                  reset()
                  saveMutation.reset()
                } else {
                  setComposerOpen(true)
                }
              }}
            >
              <ResponsiveModalTrigger asChild>
                <Button size="sm" onClick={handleOpenCreate}>
                  <Plus data-icon="inline-start" />
                  Add method
                </Button>
              </ResponsiveModalTrigger>
              <ResponsiveModalContent className="sm:max-w-md">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    saveMutation.mutate()
                  }}
                >
                  <ResponsiveModalHeader>
                    <ResponsiveModalTitle>
                      {editing ? 'Edit method' : 'Add method'}
                    </ResponsiveModalTitle>
                    <ResponsiveModalDescription>
                      Cash, card, or similar.
                    </ResponsiveModalDescription>
                  </ResponsiveModalHeader>
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
                    {saveMutation.isError ? (
                      <FieldError>{saveMutation.error.message}</FieldError>
                    ) : null}
                  </FieldGroup>
                  <ResponsiveModalFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        reset()
                        saveMutation.reset()
                      }}
                      disabled={saveMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </ResponsiveModalFooter>
                </form>
              </ResponsiveModalContent>
            </ResponsiveModal>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-1">
          <div className="px-3 py-2 md:hidden">
            {rows.length === 0 ? (
              <EmptyState
                compact
                icon={<CreditCard />}
                title="No payment methods"
                description="Optional — bills work without them."
              />
            ) : (
              <MobileList>
                {rows.map((method) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-11 min-w-11"
                            aria-label={`Actions for ${method.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(method)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              deleteMutation.reset()
                              setDeleting(method)
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                ))}
              </MobileList>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
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
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="p-0">
                      <EmptyState
                        compact
                        icon={<CreditCard />}
                        title="No payment methods"
                        description="Optional — bills work without them."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-medium">
                        {method.name}
                      </TableCell>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${method.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(method)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                deleteMutation.reset()
                                setDeleting(method)
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
