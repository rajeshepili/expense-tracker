/** When exactly one account is available, use it as the implicit default. */
export function soleAccountId(
  accounts: ReadonlyArray<{ id: string }>,
): string | null {
  return accounts.length === 1 ? accounts[0].id : null
}

export function canTransferBetweenAccounts(
  accounts: ReadonlyArray<{ id: string }>,
): boolean {
  return accounts.length >= 2
}
