const TOUR_DONE_KEY = 'expense-tracker-tour-done'

export function isTourDone(): boolean {
  try {
    return globalThis.localStorage.getItem(TOUR_DONE_KEY) === '1'
  } catch {
    return false
  }
}

export function markTourDone() {
  try {
    globalThis.localStorage.setItem(TOUR_DONE_KEY, '1')
  } catch {
    // private mode / quota
  }
}
