/** Sample seed labels → account names. */
export const SAMPLE_METHOD_TO_ACCOUNT: Record<string, string> = {
  'Debit card': 'Debit card',
  'Credit card': 'Credit card',
  Cash: 'Cash',
  'Bank transfer': 'Checking',
  'Direct deposit': 'Checking',
}

export function resolveSampleAccountName(method: string): string {
  return SAMPLE_METHOD_TO_ACCOUNT[method] ?? 'Checking'
}
