import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Wallet, Plus } from 'lucide-react'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { RowActionsMenu } from '#/components/row-actions-menu'
import { Badge } from '#/components/ui/badge'
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
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
import { cn } from 'cn'
import { toast } from 'sonner'

type FormState = {
  name: string
  type: AccountType
  startingBalance: string
}

const emptyForm = (): FormState => ({
  name: '',
  type: 'asset',
  startingBalance: '0',
})

function formFromRow(row: AccountRow): FormState {
  return {
    name: row.name,
    type: row.type,
    startingBalance: String(row.startingBalance),
  }
}

function typeLabel(type: AccountType) {
  return type === 'liability' ? 'Liability' : 'Asset'
}

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
  const typeLocked =
    Boolean(editing) &&
    ((editing?.transactionCount ?? 0) > 0 || (editing?.recurringCount ?? 0) > 0)

  const emptyAccounts = (
    <EmptyState
      compact
      icon={<Wallet />}
      title="No accounts yet"
      description="Add cash, cards, or bank accounts to track balances."
    />
  )

  function handleOpenCreate() {
    saveMutation.reset()
    openCreate()
  }

  function handleOpenEdit(row: AccountRow) {
    saveMutation.reset()
    openEdit(row)
  }

  function accountMeta(row: AccountRow) {
    return (
      <>
        {typeLabel(row.type)}
        {row.closed ? ' · Closed' : ''}
        {' · '}
        {row.transactionCount > 0 ? (
          <Link
            to="/ledger"
            search={{ method: row.id }}
            className="underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.transactionCount} transaction
            {row.transactionCount === 1 ? '' : 's'}
          </Link>
        ) : (
          <>0 transactions</>
        )}
        {row.recurringCount ? (
          <>
            {' '}
            · {row.recurringCount} bill
            {row.recurringCount === 1 ? '' : 's'}
          </>
        ) : null}
      </>
    )
  }

  function accountActions(row: AccountRow) {
    const unused = row.transactionCount === 0 && row.recurringCount === 0
    return (
      <RowActionsMenu
        label={row.name}
        size="touch"
        onEdit={() => handleOpenEdit(row)}
        onCloseAccount={
          row.closed
            ? undefined
            : () => {
                closeMutation.reset()
                setClosing(row)
              }
        }
        onReopenAccount={
          row.closed
            ? () => {
                reopenMutation.reset()
                reopenMutation.mutate(row)
              }
            : undefined
        }
        onDelete={
          unused
            ? () => {
                deleteMutation.reset()
                setDeleting(row)
              }
            : undefined
        }
      />
    )
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
          <VirtualizedDataList
            layout="flow"
            items={rows}
            getItemKey={(row) => row.id}
            mobileEstimateSize={80}
            desktopEstimateSize={52}
            colSpan={5}
            mobileClassName="px-3 py-2"
            empty={emptyAccounts}
            header={
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Activity</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
            }
            renderMobile={(account) => (
              <MobileListRow
                key={account.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <span className={cn(account.closed && 'text-muted-foreground')}>
                      {account.name}
                    </span>
                    {account.closed ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        Closed
                      </Badge>
                    ) : null}
                  </span>
                }
                meta={accountMeta(account)}
                trailing={
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      account.type === 'liability' || account.balance < 0
                        ? 'text-expense'
                        : undefined,
                      account.closed && 'text-muted-foreground',
                    )}
                  >
                    {money(account.balance, currency)}
                  </span>
                }
                onClick={() => handleOpenEdit(account)}
                actions={accountActions(account)}
              />
            )}
            renderDesktop={(account) => (
              <TableRow
                key={account.id}
                className={cn(account.closed && 'opacity-70')}
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    {account.name}
                    {account.closed ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        Closed
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {typeLabel(account.type)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums font-medium',
                    account.type === 'liability' || account.balance < 0
                      ? 'text-expense'
                      : undefined,
                  )}
                >
                  {money(account.balance, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {account.transactionCount > 0 ? (
                    <Link
                      to="/ledger"
                      search={{ method: account.id }}
                      className="underline-offset-2 hover:underline"
                    >
                      {account.transactionCount}
                    </Link>
                  ) : (
                    account.transactionCount
                  )}
                  {account.recurringCount
                    ? ` · ${account.recurringCount} bill${account.recurringCount === 1 ? '' : 's'}`
                    : null}
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    label={account.name}
                    onEdit={() => handleOpenEdit(account)}
                    onCloseAccount={
                      account.closed
                        ? undefined
                        : () => {
                            closeMutation.reset()
                            setClosing(account)
                          }
                    }
                    onReopenAccount={
                      account.closed
                        ? () => {
                            reopenMutation.reset()
                            reopenMutation.mutate(account)
                          }
                        : undefined
                    }
                    onDelete={
                      account.transactionCount === 0 &&
                      account.recurringCount === 0
                        ? () => {
                            deleteMutation.reset()
                            setDeleting(account)
                          }
                        : undefined
                    }
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

/** @deprecated use AccountsPanel */
export const PaymentMethodsPanel = AccountsPanel
