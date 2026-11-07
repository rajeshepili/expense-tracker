import { useState } from 'react'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { PaymentMethodSelect } from '#/features/shared/entity-selects'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '#/components/ui/field'
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
import { amountDue, canOneTapRecord, formatIsoDate, money } from '#/lib/finance'
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

  const payEarly = adjusting ? !canOneTapRecord(adjusting.nextDate) : false
  const title = adjusting
    ? payEarly
      ? `Pay early · ${adjusting.name}`
      : `Adjust ${adjusting.name}`
    : 'Adjust payment'
  const description = adjusting
    ? payEarly
      ? `Due ${formatIsoDate(adjusting.nextDate, true)}.`
      : adjusting.remainingAmount !== null
        ? `${money(amountDue(adjusting))} of ${money(adjusting.amount)} left.`
        : 'Change amount, date, or method.'
    : undefined

  return (
    <>
      <ComposerFormModal
        open={Boolean(adjusting)}
        onOpenChange={(open) => {
          if (!open) cancelAdjust()
        }}
        title={title}
        description={description}
        pending={recording}
        submitLabel="Record"
        pendingLabel="Recording…"
        onSubmit={handleSubmitAdjust}
      >
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
          {paymentMethods.length === 1 ? null : (
            <Field>
              <FieldLabel htmlFor="record-method">Account</FieldLabel>
              <PaymentMethodSelect
                id="record-method"
                value={adjustDraft.paymentMethodId}
                options={paymentMethods}
                onValueChange={(paymentMethodId) =>
                  setAdjustDraft((current) => ({ ...current, paymentMethodId }))
                }
              />
            </Field>
          )}
        </FieldGroup>
      </ComposerFormModal>

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
              disabled={recording}
              onClick={(event) => {
                event.preventDefault()
                confirmForceRecord()
              }}
            >
              {recording ? 'Recording…' : 'Record anyway'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
