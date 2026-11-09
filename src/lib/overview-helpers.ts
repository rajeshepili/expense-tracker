import { percent, priorDeltaRatio } from '#/lib/finance'

export function priorDeltaLabel(current: number, prior: number) {
  if (prior === 0)
    return current === 0 ? 'no activity yet' : 'first month tracked'
  const ratio = priorDeltaRatio(current, prior)
  if (ratio === null) return 'new vs prior'
  if (ratio === 0) return 'same as prior'
  const sign = ratio > 0 ? '+' : '−'
  return `${sign}${percent(Math.abs(ratio))} vs prior`
}

export type CategoryView = 'list' | 'chart'

const CATEGORY_VIEW_KEY = 'expense-tracker-category-view'

export function readCategoryView(): CategoryView {
  if (typeof window === 'undefined') return 'list'
  return window.localStorage.getItem(CATEGORY_VIEW_KEY) === 'chart'
    ? 'chart'
    : 'list'
}

export function writeCategoryView(view: CategoryView) {
  window.localStorage.setItem(CATEGORY_VIEW_KEY, view)
}
