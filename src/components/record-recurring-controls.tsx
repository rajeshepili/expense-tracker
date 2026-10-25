import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '#/components/ui/field'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '#/components/ui/responsive-modal'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Input } from '#/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  amountDue,
  canOneTapRecord,
  formatIsoDate,
  money,
} from '#/lib/finance'
import type { useRecordRecurring } from '#/hooks/use-record-recurring'

type PaymentMethod = { id: string; name: string }

type RecordRecurringControlsProps = {
  recorder: ReturnType<typeof useRecordRecurring>
  paymentMethods: PaymentMethod[]
  currencyHint?: string
}

export function RecordRecurringControls({
  recorder,
  paymentMethods,
  currencyHint,
}: RecordRecurringControlsProps) {
  const {
    adjusting,
    setAdjusting,
    adjustDraft,
    setAdjustDraft,
    submitAdjust,
    cancelAdjust,
    recording,
    pendingForce,
    confirmForceRecord,
    dismissForce,
  } = recorder

  const [amountError, setAmountError] = useState('')
  const [dateError, setDateError] = useState('')

  function validateDraft() {
    let valid = true
    const amount = Number(adjustDraft.amount)
    if (!adjustDraft.amount.trim() || !Number.isFinite(amount) || amount < 0) {
      setAmountError('Enter a valid amount (0 or more)')
      valid = false
    } else {
      setAmountError('')
    }
    if (!adjustDraft.date) {
      setDateError('Enter a date')
      valid = false
    } else {
      setDateError('')
    }
    return valid
  }

  function handleSubmitAdjust() {
    if (validateDraft()) {
      submitAdjust()
    }
  }

  return (
    <>
      <ResponsiveModal
        open={Boolean(adjusting)}
        onOpenChange={(open) => {
          if (!open) setAdjusting(null)
        }}
      >
        <ResponsiveModalContent className="sm:max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {adjusting && !canOneTapRecord(adjusting.nextDate)
                ? `Pay early · ${adjusting.name}`
                : `Adjust ${adjusting?.name ?? 'payment'}`}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {adjusting && !canOneTapRecord(adjusting.nextDate)
                ? `Due ${formatIsoDate(adjusting.nextDate, true)}.`
                : adjusting && adjusting.remainingAmount !== null
                  ? `${money(amountDue(adjusting))} of ${money(adjusting.amount)} left.`
                  : 'Change amount, date, or method.'}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <FieldGroup className="gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="record-amount">
                Amount{currencyHint ? ` (${currencyHint})` : ''}
              </FieldLabel>
              <Input
                id="record-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoComplete="off"
                value={adjustDraft.amount}
                onChange={(event) => {
                  setAmountError('')
                  setAdjustDraft((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }}
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? 'amount-error' : undefined}
              />
              {amountError ? (
                <FieldError id="amount-error">{amountError}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="record-date">Date</FieldLabel>
              <Input
                id="record-date"
                name="date"
                type="date"
                autoComplete="off"
                value={adjustDraft.date}
                onChange={(event) => {
                  setDateError('')
                  setAdjustDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'date-error' : undefined}
              />
              {dateError ? (
                <FieldError id="date-error">{dateError}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="record-method">Payment method</FieldLabel>
              <Select
                value={adjustDraft.paymentMethodId || '__none__'}
                onValueChange={(value) =>
                  setAdjustDraft((current) => ({
                    ...current,
                    paymentMethodId: value === '__none__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger id="record-method" className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">None</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <ResponsiveModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={cancelAdjust}
              disabled={recording}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitAdjust}
              disabled={recording}
              className="active:scale-[0.97]"
            >
              {recording ? 'Recording…' : 'Record'}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <AlertDialog
        open={Boolean(pendingForce)}
        onOpenChange={(open) => {
          if (!open) dismissForce()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Already recorded this cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              A payment for this bill is already linked in the current cycle.
              Record another anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recording}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                confirmForceRecord()
              }}
              disabled={recording}
            >
              {recording ? 'Recording…' : 'Record anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
