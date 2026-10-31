import type { Dispatch, SetStateAction } from 'react'
import {
  CategorySelect,
  PaymentMethodSelect,
} from '#/components/entity-selects'
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cadenceLabel } from '#/lib/finance'
import type { RecurringFormState } from '#/lib/recurring-form'
import type { RecurrenceCadence } from '#/lib/types'

type NamedOption = { id: string; name: string }

type RecurringFormFieldsProps = {
  form: RecurringFormState
  setForm: Dispatch<SetStateAction<RecurringFormState>>
  categories: NamedOption[]
  paymentMethods: NamedOption[]
}

export function RecurringFormFields({
  form,
  setForm,
  categories,
  paymentMethods,
}: RecurringFormFieldsProps) {
  return (
    <FieldGroup className="gap-4 py-2">
      <Field>
        <FieldLabel htmlFor="recurring-name">Name</FieldLabel>
        <Input
          id="recurring-name"
          name="name"
          autoComplete="off"
          spellCheck={false}
          placeholder="Internet bill…"
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
        <FieldLabel htmlFor="recurring-amount">Amount</FieldLabel>
        <Input
          id="recurring-amount"
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
      </Field>
      <Field>
        <FieldLabel htmlFor="recurring-category">Category</FieldLabel>
        <CategorySelect
          id="recurring-category"
          value={form.categoryId}
          options={categories}
          onValueChange={(categoryId) =>
            setForm((current) => ({ ...current, categoryId }))
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="recurring-method">Payment method</FieldLabel>
        <PaymentMethodSelect
          id="recurring-method"
          value={form.paymentMethodId}
          options={paymentMethods}
          onValueChange={(paymentMethodId) =>
            setForm((current) => ({ ...current, paymentMethodId }))
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="recurring-cadence">Cadence</FieldLabel>
        <Select
          value={form.cadence}
          onValueChange={(value) =>
            setForm((current) => ({
              ...current,
              cadence: value as RecurrenceCadence,
            }))
          }
        >
          <SelectTrigger id="recurring-cadence" className="w-full">
            <SelectValue placeholder="Cadence" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {(Object.keys(cadenceLabel) as RecurrenceCadence[]).map(
                (cadence) => (
                  <SelectItem key={cadence} value={cadence}>
                    {cadenceLabel[cadence]}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="recurring-next">Next date</FieldLabel>
        <Input
          id="recurring-next"
          name="nextDate"
          type="date"
          autoComplete="off"
          value={form.nextDate}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              nextDate: event.target.value,
            }))
          }
        />
      </Field>
    </FieldGroup>
  )
}
