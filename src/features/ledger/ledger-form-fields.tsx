import type { Dispatch, RefObject, SetStateAction } from 'react'
import { cn } from 'cn'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  AccountSelect,
  CategorySelect,
} from '#/features/shared/entity-selects'
import type { LedgerFormState } from '#/lib/ledger-form'
import { canTransferBetweenAccounts } from '#/lib/sole-account'
import type { TransactionType } from '#/lib/types'

type NamedOption = { id: string; name: string }

type LedgerFormFieldsProps = {
  form: LedgerFormState
  setForm: Dispatch<SetStateAction<LedgerFormState>>
  setType: (type: TransactionType) => void
  categories: NamedOption[]
  methods: NamedOption[]
  descriptionRef?: RefObject<HTMLInputElement | null>
}

export function LedgerFormFields({
  form,
  setForm,
  setType,
  categories,
  methods,
  descriptionRef,
}: LedgerFormFieldsProps) {
  const isTransfer = form.type === 'transfer'
  const showTransfer = canTransferBetweenAccounts(methods)
  const soleAccount = methods.length === 1
  const fromOptions = methods.filter((account) => account.id !== form.toAccountId)
  const toOptions = methods.filter((account) => account.id !== form.fromAccountId)

  const typeOptions = (
    [
      { id: 'expense' as const, label: 'Expense' },
      { id: 'income' as const, label: 'Income' },
      ...(showTransfer
        ? [{ id: 'transfer' as const, label: 'Transfer' }]
        : []),
    ] as const
  )

  return (
    <div className="grid gap-4 py-2">
      <div
        className={cn(
          'grid gap-1 rounded-lg border bg-muted/40 p-1',
          showTransfer ? 'grid-cols-3' : 'grid-cols-2',
        )}
        role="group"
        aria-label="Transaction type"
      >
        {typeOptions.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              'min-h-11 md:min-h-8',
              form.type === option.id
                ? option.id === 'expense'
                  ? 'bg-card text-expense shadow-sm ring-1 ring-expense/25 hover:bg-card hover:text-expense'
                  : option.id === 'income'
                    ? 'bg-card text-income shadow-sm ring-1 ring-income/25 hover:bg-card hover:text-income'
                    : 'bg-card text-foreground shadow-sm ring-1 ring-border hover:bg-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setType(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ledger-description">
          {isTransfer ? 'Note (optional)' : 'Description'}
        </Label>
        <Input
          ref={descriptionRef}
          id="ledger-description"
          name="description"
          autoComplete="off"
          spellCheck={false}
          placeholder={isTransfer ? 'Optional note…' : 'Coffee shop…'}
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="ledger-amount">Amount</Label>
          <Input
            id="ledger-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoComplete="off"
            placeholder="0.00"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ledger-date">Date</Label>
          <Input
            id="ledger-date"
            name="date"
            type="date"
            autoComplete="off"
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                date: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <div
        key={isTransfer ? 'transfer' : 'standard'}
        className="composer-fields-pane grid gap-4"
      >
        {isTransfer ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="ledger-from-account">From account</Label>
              <AccountSelect
                id="ledger-from-account"
                value={form.fromAccountId}
                options={fromOptions}
                placeholder="Choose account"
                allowNone={false}
                onValueChange={(fromAccountId) =>
                  setForm((current) => ({ ...current, fromAccountId }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ledger-to-account">To account</Label>
              <AccountSelect
                id="ledger-to-account"
                value={form.toAccountId}
                options={toOptions}
                placeholder="Choose account"
                allowNone={false}
                onValueChange={(toAccountId) =>
                  setForm((current) => ({ ...current, toAccountId }))
                }
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="ledger-category">Category</Label>
              <CategorySelect
                id="ledger-category"
                value={form.categoryId}
                options={categories}
                onValueChange={(categoryId) =>
                  setForm((current) => ({ ...current, categoryId }))
                }
              />
            </div>
            {soleAccount ? null : (
              <div className="grid gap-2">
                <Label htmlFor="ledger-account">Account</Label>
                <AccountSelect
                  id="ledger-account"
                  value={form.paymentMethodId}
                  options={methods}
                  placeholder="Optional account"
                  onValueChange={(paymentMethodId) =>
                    setForm((current) => ({ ...current, paymentMethodId }))
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
