import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MoreHorizontal, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { MobileList, MobileListRow } from '#/components/layout/mobile-list'
import { PageShell, TableScroll } from '#/components/layout/page-shell'
import { PaymentMethodsPanel } from '#/components/payment-methods-panel'
import {
  createCategory,
  deleteCategory,
  listCategoriesWithUsage,
  updateCategory,
} from '#/data/repository'
import { useComposer } from '#/hooks/use-composer'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { CategoryRow, TransactionType } from '#/lib/types'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

type FormState = {
  name: string
  type: TransactionType
}

const emptyForm = (): FormState => ({
  name: '',
  type: 'expense',
})

function formFromRow(row: CategoryRow): FormState {
  return { name: row.name, type: row.type }
}

function CategoriesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | TransactionType>('all')
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [replacementId, setReplacementId] = useState('')
  const {
    editing,
    form,
    composerOpen,
    setForm,
    setComposerOpen,
    openCreate,
    openEdit,
    reset,
  } = useComposer<FormState, CategoryRow>({ emptyForm, formFromRow })

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categoriesUsage,
    queryFn: listCategoriesWithUsage,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Enter a category name')
      if (editing) {
        await updateCategory(editing.id, form)
      } else {
        await createCategory(form)
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'categories',
        'transactions',
        'recurring',
      ])
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No category selected')
      const inUse = deleting.transactionCount + deleting.recurringCount > 0
      await deleteCategory(
        deleting.id,
        inUse ? { replacementCategoryId: replacementId } : undefined,
      )
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'categories',
        'transactions',
        'recurring',
      ])
      setDeleting(null)
      setReplacementId('')
    },
  })

  const rows = useMemo(() => {
    const all = categoriesQuery.data ?? []
    if (filter === 'all') return all
    return all.filter((row) => row.type === filter)
  }, [categoriesQuery.data, filter])

  const totals = useMemo(() => {
    const all = categoriesQuery.data ?? []
    return {
      expense: all.filter((row) => row.type === 'expense').length,
      income: all.filter((row) => row.type === 'income').length,
    }
  }, [categoriesQuery.data])

  const replacementOptions = useMemo(() => {
    if (!deleting) return []
    return (categoriesQuery.data ?? []).filter(
      (row) => row.id !== deleting.id && row.type === deleting.type,
    )
  }, [categoriesQuery.data, deleting])

  const deletingInUse = deleting
    ? deleting.transactionCount + deleting.recurringCount > 0
    : false

  function openDelete(row: CategoryRow) {
    setDeleting(row)
    setReplacementId('')
    deleteMutation.reset()
  }

  if (categoriesQuery.isPending) {
    return <PageLoading label="Loading categories…" />
  }

  if (categoriesQuery.isError) {
    return (
      <PageError
        title="Could not load categories"
        message={categoriesQuery.error.message}
        onRetry={() => void categoriesQuery.refetch()}
      />
    )
  }

  return (
    <PageShell scroll="page">
      <PageHeader
        title="Categories"
        description="Organize income and expenses."
        actions={
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
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add category</span>
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
                    {editing ? 'Edit category' : 'Add category'}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Used in Ledger and Recurring.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <FieldGroup className="gap-4 py-2">
                  <Field>
                    <FieldLabel htmlFor="category-name">Name</FieldLabel>
                    <Input
                      id="category-name"
                      name="name"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Subscriptions…"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="category-type">Type</FieldLabel>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          type: value as TransactionType,
                        }))
                      }
                    >
                      <SelectTrigger id="category-type" className="w-full">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Your categories</CardTitle>
          <CardDescription>
            {totals.expense} expense · {totals.income} income
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4">
          <Tabs
            value={filter}
            onValueChange={(value) =>
              setFilter(value as 'all' | TransactionType)
            }
            className="shrink-0"
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                All
              </TabsTrigger>
              <TabsTrigger value="expense" className="flex-1 sm:flex-none">
                Expense
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1 sm:flex-none">
                Income
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden">
            {rows.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Add a category to get started."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus data-icon="inline-start" />
                    Add
                  </Button>
                }
              />
            ) : (
              <MobileList>
                {rows.map((category) => (
                  <MobileListRow
                    key={category.id}
                    title={category.name}
                    meta={`${category.type} · ${category.transactionCount} txn${category.recurringCount ? ` · ${category.recurringCount} bills` : ''}`}
                    onClick={() => openEdit(category)}
                    actions={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-11 min-w-11"
                            aria-label={`Actions for ${category.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(category)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDelete(category)}
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

          <TableScroll className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Transactions
                  </TableHead>
                  <TableHead className="hidden text-right whitespace-nowrap sm:table-cell">
                    Recurring
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        title="No categories yet"
                        description="Add a category to get started."
                        action={
                          <Button size="sm" onClick={openCreate}>
                            <Plus data-icon="inline-start" />
                            Add category
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            category.type === 'income'
                              ? 'badge-income capitalize'
                              : 'badge-expense capitalize'
                          }
                        >
                          {category.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {category.transactionCount}
                      </TableCell>
                      <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
                        {category.recurringCount}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${category.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEdit(category)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDelete(category)}
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
          </TableScroll>
        </CardContent>
      </Card>

      <PaymentMethodsPanel />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            setReplacementId('')
            deleteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{deleting?.name ?? 'category'}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingInUse ? (
                <>
                  This category is used by {deleting?.transactionCount}{' '}
                  transaction
                  {(deleting?.transactionCount ?? 0) === 1 ? '' : 's'} and{' '}
                  {deleting?.recurringCount} recurring item
                  {(deleting?.recurringCount ?? 0) === 1 ? '' : 's'}. Choose a
                  replacement of the same type, then delete.
                </>
              ) : (
                <>This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingInUse ? (
            <Field className="py-2">
              <FieldLabel htmlFor="category-replacement">
                Move items to
              </FieldLabel>
              {replacementOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create another {deleting?.type} category first, then try
                  again.
                </p>
              ) : (
                <Select
                  value={replacementId || '__unset__'}
                  onValueChange={(value) =>
                    setReplacementId(value === '__unset__' ? '' : value)
                  }
                >
                  <SelectTrigger id="category-replacement" className="w-full">
                    <SelectValue placeholder="Choose replacement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__unset__" disabled>
                        Choose replacement
                      </SelectItem>
                      {replacementOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>
          ) : null}

          {deleteMutation.isError ? (
            <FieldError>{deleteMutation.error.message}</FieldError>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={
                deleteMutation.isPending ||
                (deletingInUse &&
                  (!replacementId || replacementOptions.length === 0))
              }
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending
                ? 'Deleting…'
                : deletingInUse
                  ? 'Reassign & delete'
                  : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
