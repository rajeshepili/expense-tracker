import type { AccountRow, AccountType } from '#/lib/types'

export type FormState = {
  name: string
  type: AccountType
  startingBalance: string
}

export const emptyForm = (): FormState => ({
  name: '',
  type: 'asset',
  startingBalance: '0',
})

export function formFromRow(row: AccountRow): FormState {
  return {
    name: row.name,
    type: row.type,
    startingBalance: String(row.startingBalance),
  }
}

export function typeLabel(type: AccountType) {
  return type === 'liability' ? 'Liability' : 'Asset'
}
