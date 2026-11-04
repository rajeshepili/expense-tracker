import type { AccountType, TransactionType, TransferDirection } from '#/lib/types'

export const MONEY_EPSILON = 1e-4

export function inferAccountTypeFromName(name: string): AccountType {
  return /credit card/i.test(name) ? 'liability' : 'asset'
}

export type TransactionDeltaRow = {
  type: TransactionType
  amount: number
  transferDirection?: TransferDirection | null
}

export function isCashflowTransaction(type: TransactionType): boolean {
  return type === 'income' || type === 'expense'
}

export function signedDelta(
  accountType: AccountType,
  row: TransactionDeltaRow,
): number {
  const amount = row.amount
  if (row.type === 'transfer') {
    if (accountType === 'asset') {
      return row.transferDirection === 'in' ? amount : -amount
    }
    return row.transferDirection === 'out' ? amount : -amount
  }
  if (accountType === 'asset') {
    return row.type === 'income' ? amount : -amount
  }
  return row.type === 'income' ? -amount : amount
}

export function accountBalance(
  startingBalance: number,
  rows: Iterable<TransactionDeltaRow>,
  accountType: AccountType,
): number {
  let balance = startingBalance
  for (const row of rows) {
    balance += signedDelta(accountType, row)
  }
  return balance
}

export function netWorth(
  accounts: Iterable<{ type: AccountType; balance: number; closed?: boolean }>,
): number {
  let total = 0
  for (const account of accounts) {
    if (account.closed) continue
    total += account.type === 'asset' ? account.balance : -account.balance
  }
  return total
}
