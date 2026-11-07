import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { ConfirmDeleteDialog } from '#/features/shared/confirm-delete-dialog'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { PageHeader } from '#/components/layout/page-header'
import { PageError, PageLoading } from '#/components/layout/page-query-state'
import { PageShell } from '#/components/layout/page-shell'
import { CategoryLists } from '#/features/categories/category-lists'
import { AccountsPanel } from '#/features/categories/accounts-panel'
import {
  createCategory,
  deleteCategory,
  listCategoriesWithUsage,
  updateCategory,
} from '#/data/repository'
import { formatQueryError } from '#/lib/errors'
import { useComposer } from '#/hooks/use-composer'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { CategoryRow, CategoryType } from '#/lib/types'

type FormState = {
  name: string
  type: CategoryType
}

const emptyForm = (): FormState => ({
  name: '',
  type: 'expense',
})

function formFromRow(row: CategoryRow): FormState {
  return { name: row.name, type: row.type }
}

export function CategoriesScreen() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | CategoryType>('all')
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [replacementId, setReplacementId] = useState('')
  const {
    editing,
    form,
    composerOpen,
    setForm,
    openCreate,
    openEdit,
    reset,
    bindOpenChange,
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
    return <PageLoading label="Loading categories…" variant="categories" />
  }

  if (categoriesQuery.isError) {
    return (
      <PageError
        title="Could not load categories"
        message={formatQueryError(categoriesQuery.error)}
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
          <ComposerFormModal
            open={composerOpen}
            onOpenChange={bindOpenChange(() => saveMutation.reset())}
            trigger={
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                <span className="md:hidden">Add</span>
                <span className="hidden md:inline">Add category</span>
              </Button>
            }
            title={editing ? 'Edit category' : 'Add category'}
            description="Used in Ledger and Recurring."
            pending={saveMutation.isPending}
            error={saveMutation.error?.message}
            onSubmit={() => saveMutation.mutate()}
          >
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
                      type: value as CategoryType,
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
            </FieldGroup>
          </ComposerFormModal>
        }
      />

      <Card className="flex shrink-0 flex-col gap-0 py-0">
        <CardHeader className="shrink-0 border-b py-3">
          <CardTitle className="text-base">Your categories</CardTitle>
          <CardDescription>
            {totals.expense} expense · {totals.income} income
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as 'all' | CategoryType)}
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

          <CategoryLists
            rows={rows}
            filter={filter}
            totalCount={(categoriesQuery.data ?? []).length}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        </CardContent>
      </Card>

      <AccountsPanel />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            setReplacementId('')
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.name ?? 'category'}”?`}
        description={
          deletingInUse ? (
            <>
              This category is used by {deleting?.transactionCount} transaction
              {(deleting?.transactionCount ?? 0) === 1 ? '' : 's'} and{' '}
              {deleting?.recurringCount} recurring item
              {(deleting?.recurringCount ?? 0) === 1 ? '' : 's'}. Choose a
              replacement of the same type, then delete.
            </>
          ) : (
            'This cannot be undone.'
          )
        }
        confirmLabel={deletingInUse ? 'Reassign & delete' : 'Delete'}
        pending={deleteMutation.isPending}
        confirmDisabled={
          deletingInUse && (!replacementId || replacementOptions.length === 0)
        }
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      >
        {deletingInUse ? (
          <Field className="py-2">
            <FieldLabel htmlFor="category-replacement">
              Move items to
            </FieldLabel>
            {replacementOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create another {deleting?.type} category first, then try again.
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
      </ConfirmDeleteDialog>
    </PageShell>
  )
}
