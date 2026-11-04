export function formatIsoDate(iso: string, withYear = false) {
  if (!iso) return '—'
  const date = new Date(`${iso}T12:00:00`)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  }).format(date)
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function currentYearMonth(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function isYearMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/** Valid calendar date as YYYY-MM-DD. */
export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number) {
  if (!isYearMonth(yearMonth)) return yearMonth
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + deltaMonths, 1))
  return currentYearMonth(date)
}

export function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  if (!year || !month) return yearMonth
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function compareIsoDate(a: string, b: string) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function defaultDateForMonth(
  yearMonth: string | undefined,
  today = todayIso(),
) {
  if (!yearMonth || yearMonth === 'all' || !isYearMonth(yearMonth)) {
    return today
  }
  if (yearMonth === currentYearMonth(new Date(`${today}T12:00:00`))) {
    return today
  }
  const [year, month] = yearMonth.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`
}
