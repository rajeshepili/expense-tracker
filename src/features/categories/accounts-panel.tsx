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
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  closeAccount,
  createAccount,
  deleteAccount,
  getSettings,
  listAccountsWithBalances,
  updateAccount,
} from '#/data/repository'
import { makeMutationErrorHandler } from '#/lib/errors'
import { money } from '#/lib/finance'
import { useComposer } from '#/hooks/use-composer'
import { invalidateAfter } from '#/lib/query/invalidation'
import { queryKeys } from '#/lib/query/keys'
import type { AccountRow, AccountType } from '#/lib/types'
import { toast } from 'sonner'
import { emptyForm, formFromRow } from './account-form'
import type { FormState } from './account-form'
import { AccountDetailSheet } from './account-detail-sheet'
import { AccountsList } from './accounts-list'

export function AccountsPanel() {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<AccountRow | null>(null)
  const [closing, setClosing] = useState<AccountRow | null>(null)
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
  } = useComposer<FormState, AccountRow>({
    emptyForm,
    formFromRow,
  })

  const accountsQuery = useQuery({
    queryKey: queryKeys.accountsUsage,
    queryFn: listAccountsWithBalances,
  })
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  })
  const currency = settingsQuery.data?.currency ?? 'USD'

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Enter an account name')
      const startingBalance = Number(form.startingBalance)
      if (!Number.isFinite(startingBalance)) {
        throw new Error('Starting balance must be a number')
      }
      if (editing) {
        await updateAccount(editing.id, {
          name: form.name,
          type: form.type,
          startingBalance,
        })
      } else {
        await createAccount({
          name: form.name,
          type: form.type,
          startingBalance,
        })
      }
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['accounts', 'transactions'])
      reset()
    },
    onError: makeMutationErrorHandler(setSaveError, 'Could not save'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleting) throw new Error('No account selected')
      await deleteAccount(deleting.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['accounts', 'transactions'])
      setDeleting(null)
    },
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!closing) throw new Error('No account selected')
      await closeAccount(closing.id)
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['accounts', 'transactions'])
      setClosing(null)
      toast.success('Account closed')
    },
  })

  const reopenMutation = useMutation({
    mutationFn: async (row: AccountRow) => {
      await updateAccount(row.id, { closed: false })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, ['accounts', 'transactions'])
      toast.success('Account reopened')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Could not reopen account')
    },
  })

  const rows = accountsQuery.data ?? []
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailItem = useMemo(
    () => (detailId ? (rows.find((row) => row.id === detailId) ?? null) : null),
    [detailId, rows],
  )
  const typeLocked =
    Boolean(editing) &&
    ((editing?.transactionCount ?? 0) > 0 || (editing?.recurringCount ?? 0) > 0)

  function handleOpenCreate() {
    saveMutation.reset()
    openCreate()
  }

  function handleOpenEdit(row: AccountRow) {
    saveMutation.reset()
    openEdit(row)
  }

  return (
    <>
      <Card className="shrink-0 gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription>
            Balances for cash, cards, and bank accounts.
          </CardDescription>
          <div className="pt-1">
            <ComposerFormModal
              open={composerOpen}
              onOpenChange={bindOpenChange(() => saveMutation.reset())}
              trigger={
                <Button size="sm" onClick={handleOpenCreate}>
                  <Plus data-icon="inline-start" />
                  Add account
                </Button>
              }
              title={editing ? 'Edit account' : 'Add account'}
              description="Starting balance is the amount before ledger entries."
              pending={saveMutation.isPending}
              error={saveError}
              onSubmit={() => saveMutation.mutate()}
            >
              <FieldGroup className="gap-4 py-2">
                <Field>
                  <FieldLabel htmlFor="account-name">Name</FieldLabel>
                  <Input
                    id="account-name"
                    name="name"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Checking…"
                    className="min-h-11 md:min-h-9"
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
                  <FieldLabel htmlFor="account-type">Type</FieldLabel>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        type: value as AccountType,
                      }))
                    }
                    disabled={typeLocked}
                  >
                    <SelectTrigger
                      id="account-type"
                      className="min-h-11 w-full md:min-h-9"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {typeLocked ? (
                    <p className="text-xs text-muted-foreground">
                      Type can’t change while this account has transactions or
                      bills.
                    </p>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="account-starting-balance">
                    Starting balance
                  </FieldLabel>
                  <Input
                    id="account-starting-balance"
                    name="startingBalance"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className="min-h-11 md:min-h-9"
                    value={form.startingBalance}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startingBalance: event.target.value,
                      }))
                    }
                  />
                </Field>
              </FieldGroup>
            </ComposerFormModal>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-1">
          <AccountsList
            rows={rows}
            currency={currency}
            onOpenDetail={(row) => setDetailId(row.id)}
          />
        </CardContent>
      </Card>

      <AccountDetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
        currency={currency}
        onEdit={handleOpenEdit}
        onClose={(row) => {
          closeMutation.reset()
          setClosing(row)
        }}
        onReopen={(row) => {
          reopenMutation.reset()
          reopenMutation.mutate(row)
        }}
        onDelete={(row) => {
          deleteMutation.reset()
          setDeleting(row)
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title={`Delete “${deleting?.name ?? 'account'}”?`}
        description="This cannot be undone."
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message ?? null}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDeleteDialog
        open={Boolean(closing)}
        onOpenChange={(open) => {
          if (!open) {
            setClosing(null)
            closeMutation.reset()
          }
        }}
        title={`Close “${closing?.name ?? 'account'}”?`}
        description={
          closing
            ? `Balance must be zero to close. Current balance: ${money(closing.balance, currency)}.`
            : 'Balance must be zero to close.'
        }
        confirmLabel="Close"
        pendingLabel="Closing…"
        pending={closeMutation.isPending}
        error={closeMutation.error?.message ?? null}
        onConfirm={() => closeMutation.mutate()}
      />
    </>
  )
}
