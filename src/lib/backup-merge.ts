export type MergeAction = 'insert' | 'update' | 'skip'

export type TimestampedRow = {
  id: string
  /** Unix seconds (SQLite `unixepoch()` / drizzle timestamp integer). */
  createdAt: number
}

export type SettingsSnapshot = {
  id: string
  budget: number
  currency: string
  /** Unix seconds, or null if never onboarded. */
  seededAt: number | null
}

export type MonthlyBudgetSnapshot = {
  yearMonth: string
  budget: number
}

export type CategorySnapshot = TimestampedRow & {
  name: string
  type: 'expense' | 'income'
}

export type AccountSnapshot = TimestampedRow & {
  name: string
  type: 'asset' | 'liability'
  startingBalance: number
  closed: boolean
}

export type TransactionSnapshot = TimestampedRow & {
  description: string
  amount: number
  type: 'expense' | 'income' | 'transfer'
  transactionDate: string
  categoryId: string | null
  accountId: string | null
  sourceRecurringId: string | null
  transferId: string | null
  transferDirection: 'out' | 'in' | null
}

export type RecurringSnapshot = TimestampedRow & {
  name: string
  kind: 'expense' | 'income'
  amount: number
  remainingAmount: number | null
  cadence: 'weekly' | 'monthly' | 'yearly'
  nextDate: string
  active: boolean
  categoryId: string
  accountId: string | null
}

export type SavingsSnapshot = TimestampedRow & {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  categoryId: string | null
}

export type BackupSnapshot = {
  settings: SettingsSnapshot | null
  monthlyBudgets: MonthlyBudgetSnapshot[]
  categories: CategorySnapshot[]
  accounts: AccountSnapshot[]
  transactions: TransactionSnapshot[]
  recurring: RecurringSnapshot[]
  savings: SavingsSnapshot[]
}

export type MergePlan = {
  settings: SettingsSnapshot | null
  replaceSettings: boolean
  monthlyBudgets: MonthlyBudgetSnapshot[]
  categories: { action: Exclude<MergeAction, 'skip'>; row: CategorySnapshot }[]
  accounts: { action: Exclude<MergeAction, 'skip'>; row: AccountSnapshot }[]
  recurring: { action: Exclude<MergeAction, 'skip'>; row: RecurringSnapshot }[]
  savings: { action: Exclude<MergeAction, 'skip'>; row: SavingsSnapshot }[]
  transactions: {
    action: Exclude<MergeAction, 'skip'>
    row: TransactionSnapshot
  }[]
}

export type MergeStats = {
  inserted: number
  updated: number
  skipped: number
  settingsReplaced: boolean
}

function asUnixSeconds(value: number | Date | null | undefined): number {
  if (value == null) return 0
  if (value instanceof Date) return Math.floor(value.getTime() / 1000)
  // Drizzle sometimes surfaces ms; normalize large values.
  if (value > 1e12) return Math.floor(value / 1000)
  return Math.floor(value)
}

export function decideTimestampedMerge(
  local: TimestampedRow | undefined,
  incoming: TimestampedRow,
): MergeAction {
  if (!local) return 'insert'
  const localAt = asUnixSeconds(local.createdAt)
  const incomingAt = asUnixSeconds(incoming.createdAt)
  if (incomingAt > localAt) return 'update'
  return 'skip'
}

export function decideSettingsMerge(
  local: SettingsSnapshot | null | undefined,
  incoming: SettingsSnapshot | null | undefined,
): { replace: boolean; row: SettingsSnapshot | null } {
  if (!incoming) return { replace: false, row: null }
  if (!local) return { replace: true, row: incoming }
  // Unseeded local: take backup settings.
  if (local.seededAt == null) return { replace: true, row: incoming }
  return { replace: false, row: null }
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) map.set(row.id, row)
  return map
}

function planTimestamped<T extends TimestampedRow>(
  localRows: T[],
  incomingRows: T[],
): { action: Exclude<MergeAction, 'skip'>; row: T }[] {
  const localById = indexById(localRows)
  const out: { action: Exclude<MergeAction, 'skip'>; row: T }[] = []
  for (const incoming of incomingRows) {
    const action = decideTimestampedMerge(localById.get(incoming.id), incoming)
    if (action === 'skip') continue
    out.push({ action, row: incoming })
  }
  return out
}

export function planMerge(
  local: BackupSnapshot,
  incoming: BackupSnapshot,
): MergePlan {
  const settingsDecision = decideSettingsMerge(
    local.settings,
    incoming.settings,
  )

  const localMonths = new Set(local.monthlyBudgets.map((m) => m.yearMonth))
  const monthlyBudgets = incoming.monthlyBudgets.filter(
    (m) => !localMonths.has(m.yearMonth),
  )

  return {
    settings: settingsDecision.row,
    replaceSettings: settingsDecision.replace,
    monthlyBudgets,
    categories: planTimestamped(local.categories, incoming.categories),
    accounts: planTimestamped(local.accounts, incoming.accounts),
    recurring: planTimestamped(local.recurring, incoming.recurring),
    savings: planTimestamped(local.savings, incoming.savings),
    transactions: planTimestamped(local.transactions, incoming.transactions),
  }
}

export function summarizeMergePlan(plan: MergePlan): MergeStats {
  const groups = [
    plan.categories,
    plan.accounts,
    plan.recurring,
    plan.savings,
    plan.transactions,
  ]
  let inserted = plan.monthlyBudgets.length
  let updated = 0
  for (const group of groups) {
    for (const item of group) {
      if (item.action === 'insert') inserted += 1
      else updated += 1
    }
  }
  if (plan.replaceSettings) inserted += 1
  return {
    inserted,
    updated,
    skipped: 0,
    settingsReplaced: plan.replaceSettings,
  }
}

export function countSkipped(
  local: BackupSnapshot,
  incoming: BackupSnapshot,
  plan: MergePlan,
): number {
  const plannedIds = (items: { row: { id: string } }[]) =>
    new Set(items.map((i) => i.row.id))

  let skipped = 0
  const catIds = plannedIds(plan.categories)
  for (const row of incoming.categories) if (!catIds.has(row.id)) skipped += 1
  const accIds = plannedIds(plan.accounts)
  for (const row of incoming.accounts) if (!accIds.has(row.id)) skipped += 1
  const recIds = plannedIds(plan.recurring)
  for (const row of incoming.recurring) if (!recIds.has(row.id)) skipped += 1
  const savIds = plannedIds(plan.savings)
  for (const row of incoming.savings) if (!savIds.has(row.id)) skipped += 1
  const txIds = plannedIds(plan.transactions)
  for (const row of incoming.transactions) if (!txIds.has(row.id)) skipped += 1

  const localMonths = new Set(local.monthlyBudgets.map((m) => m.yearMonth))
  for (const m of incoming.monthlyBudgets) {
    if (localMonths.has(m.yearMonth)) skipped += 1
  }
  if (incoming.settings && !plan.replaceSettings) skipped += 1
  return skipped
}
