import type { LedgerTransaction } from '#/lib/types'
import { compareIsoDate } from '#/lib/finance'

export type DuplicateCandidate = {
  description: string
  amount: number
  date: string
  type: 'expense' | 'income' | 'transfer'
}

const WINDOW_DAYS = 3

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function dayDiff(a: string, b: string): number {
  const ms =
    new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

/** Same type/amount/description within ±3 days; skips transfers. */
export function findPossibleDuplicate(
  rows: LedgerTransaction[],
  candidate: DuplicateCandidate,
  excludeId?: string,
): LedgerTransaction | null {
  if (candidate.type === 'transfer') return null
  const needle = normalize(candidate.description)
  if (!needle) return null
  let best: LedgerTransaction | null = null
  for (const row of rows) {
    if (row.id === excludeId) continue
    if (row.type !== candidate.type) continue
    if (Math.abs(row.amount - candidate.amount) > 0.01) continue
    if (normalize(row.description) !== needle) continue
    if (Math.abs(dayDiff(row.date, candidate.date)) > WINDOW_DAYS) continue
    if (!best || compareIsoDate(row.date, best.date) > 0) best = row
  }
  return best
}
