import type { LedgerTransaction } from '#/lib/types'

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const HEADERS = [
  'date',
  'type',
  'description',
  'category',
  'account',
  'amount',
] as const

export function transactionsToCsv(rows: LedgerTransaction[]): string {
  const lines = [HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.type,
        csvField(row.description),
        csvField(row.category ?? ''),
        csvField(row.account ?? row.paymentMethod ?? ''),
        row.amount.toFixed(2),
      ].join(','),
    )
  }
  return lines.join('\n') + '\n'
}
