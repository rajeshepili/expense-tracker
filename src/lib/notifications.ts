import { listRecurring } from '#/data/repository'
import { compareIsoDate, formatIsoDate, todayIso } from '#/lib/finance'
import type { RecurringExpenseRow } from '#/lib/types'

const REMINDERS_ENABLED_KEY = 'pocketbook-reminders-enabled'
export const REMINDER_WINDOW_DAYS = 2
const DAY_MS = 24 * 60 * 60 * 1000

export function isRemindersEnabled(): boolean {
  try {
    return globalThis.localStorage.getItem(REMINDERS_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function setRemindersEnabled(enabled: boolean) {
  try {
    globalThis.localStorage.setItem(REMINDERS_ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    // private mode / quota
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

function daysUntil(isoDate: string, today: string) {
  const a = new Date(`${isoDate}T12:00:00`).getTime()
  const b = new Date(`${today}T12:00:00`).getTime()
  return Math.round((a - b) / DAY_MS)
}

export type BillReminder = {
  id: string
  name: string
  amount: number
  nextDate: string
  kind: 'expense' | 'income'
  daysUntil: number
}

export function dueSoonReminders(
  rows: RecurringExpenseRow[],
  today = todayIso(),
  windowDays = REMINDER_WINDOW_DAYS,
): BillReminder[] {
  return rows
    .filter((row) => row.active)
    .map((row) => ({ row, days: daysUntil(row.nextDate, today) }))
    .filter(({ days }) => days >= 0 && days <= windowDays)
    .map(({ row, days }) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      nextDate: row.nextDate,
      kind: row.kind,
      daysUntil: days,
    }))
    .sort((a, b) => compareIsoDate(a.nextDate, b.nextDate))
}

/** Due-soon bill notifications (needs permission + setting). */
export async function scheduleBillReminders(
  opts: { windowDays?: number; force?: boolean } = {},
): Promise<BillReminder[]> {
  if (!isRemindersEnabled() && !opts.force) return []
  if (typeof window === 'undefined' || !('Notification' in window)) return []
  if (Notification.permission !== 'granted') return []

  let rows: RecurringExpenseRow[]
  try {
    rows = await listRecurring()
  } catch {
    return []
  }

  const reminders = dueSoonReminders(rows, todayIso(), opts.windowDays)
  let registration: ServiceWorkerRegistration | undefined
  try {
    registration = await navigator.serviceWorker?.getRegistration()
  } catch {
    registration = undefined
  }

  for (const reminder of reminders) {
    const when =
      reminder.daysUntil === 0
        ? 'today'
        : reminder.daysUntil === 1
          ? 'tomorrow'
          : `in ${reminder.daysUntil} days`
    const label = reminder.kind === 'income' ? 'Income' : 'Bill'
    const body = `${reminder.name} — ${reminder.amount.toFixed(2)} due ${when} (${formatIsoDate(reminder.nextDate)})`
    const options: NotificationOptions = {
      body,
      tag: `bill-${reminder.id}-${reminder.nextDate}`,
      icon: '/icons/icon-192.png',
    }
    try {
      if (registration)
        await registration.showNotification(`${label} due ${when}`, options)
      else new Notification(`${label} due ${when}`, options)
    } catch {
      // ignore Notification throws
    }
  }
  return reminders
}
