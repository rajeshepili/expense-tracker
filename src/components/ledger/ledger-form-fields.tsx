import type { Dispatch, RefObject, SetStateAction } from 'react'
import { cn } from 'cn'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  CategorySelect,
  PaymentMethodSelect,
} from '#/components/entity-selects'
import type { LedgerFormState } from '#/lib/ledger-form'
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
  return (
    <div className="grid gap-4 py-2">
      <div
        className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1"
        role="group"
        aria-label="Transaction type"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            'h-8',
            form.type === 'expense'
              ? 'bg-card text-expense shadow-sm ring-1 ring-expense/25 hover:bg-card hover:text-expense'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setType('expense')}
        >
          Expense
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            'h-8',
            form.type === 'income'
              ? 'bg-card text-income shadow-sm ring-1 ring-income/25 hover:bg-card hover:text-income'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setType('income')}
        >
          Income
        </Button>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ledger-description">Description</Label>
        <Input
          ref={descriptionRef}
          id="ledger-description"
          name="description"
          autoComplete="off"
          spellCheck={false}
          placeholder="Coffee shop…"
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
      <div className="grid gap-2">
        <Label htmlFor="ledger-method">Payment method</Label>
        <PaymentMethodSelect
          id="ledger-method"
          value={form.paymentMethodId}
          options={methods}
          onValueChange={(paymentMethodId) =>
            setForm((current) => ({ ...current, paymentMethodId }))
          }
        />
      </div>
    </div>
  )
}
