import type {
  LedgerTransaction,
  TransferDirection,
  TransactionType,
} from '#/lib/types'
import { getTransferPair } from '#/data/repository'
import { todayIso } from '#/lib/finance'

export type LedgerFormState = {
  description: string
  amount: string
  type: TransactionType
  categoryId: string
  paymentMethodId: string
  fromAccountId: string
  toAccountId: string
  date: string
}

export type LedgerSaveVars = {
  editingId: string | null
  description: string
  amount: number
  type: Exclude<TransactionType, 'transfer'>
  date: string
  categoryId: string
  categoryName: string
  paymentMethodId: string | null
  paymentMethodName: string | null
}

export function emptyLedgerForm(): LedgerFormState {
  return {
    description: '',
    amount: '',
    type: 'expense',
    categoryId: '',
    paymentMethodId: '',
    fromAccountId: '',
    toAccountId: '',
    date: todayIso(),
  }
}

function isAutoTransferDescription(value: string) {
  return (
    value.startsWith('Transfer to ') || value.startsWith('Transfer from ')
  )
}

export function formFromTransaction(tx: LedgerTransaction): LedgerFormState {
  if (tx.type === 'transfer') {
    return {
      description: isAutoTransferDescription(tx.description)
        ? ''
        : tx.description,
      amount: String(tx.amount),
      type: 'transfer',
      categoryId: '',
      paymentMethodId: '',
      fromAccountId:
        tx.transferDirection === 'out' ? (tx.accountId ?? '') : '',
      toAccountId: tx.transferDirection === 'in' ? (tx.accountId ?? '') : '',
      date: tx.date,
    }
  }
  return {
    description: tx.description,
    amount: String(tx.amount),
    type: tx.type,
    categoryId: tx.categoryId ?? '',
    paymentMethodId: tx.paymentMethodId ?? '',
    fromAccountId: '',
    toAccountId: '',
    date: tx.date,
  }
}

export async function formFromTransferLeg(
  tx: LedgerTransaction,
): Promise<LedgerFormState> {
  if (tx.type !== 'transfer' || !tx.transferId) {
    return formFromTransaction(tx)
  }
  const pair = await getTransferPair(tx.id)
  const custom =
    !isAutoTransferDescription(pair.out.description) ||
    !isAutoTransferDescription(pair.in.description)
  return {
    description: custom ? pair.out.description : '',
    amount: String(pair.out.amount),
    type: 'transfer',
    categoryId: '',
    paymentMethodId: '',
    fromAccountId: pair.out.accountId ?? '',
    toAccountId: pair.in.accountId ?? '',
    date: pair.out.date,
  }
}

export function transactionMeta(tx: LedgerTransaction): string {
  const parts: string[] = []
  if (tx.type === 'transfer') {
    parts.push('Transfer')
    if (tx.account) parts.push(tx.account)
    return parts.join(' · ')
  }
  if (tx.category) parts.push(tx.category)
  if (tx.paymentMethod) parts.push(tx.paymentMethod)
  return parts.join(' · ')
}

export function transferBadgeClass(direction: TransferDirection | null) {
  if (direction === 'in') return 'badge-income capitalize'
  if (direction === 'out') return 'badge-expense capitalize'
  return 'badge-transfer capitalize'
}

/** Prefetch pair and fill form when opening a transfer for edit. */
export async function prepareTransferEdit(tx: LedgerTransaction) {
  return formFromTransferLeg(tx)
}
