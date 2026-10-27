/**
 * Public data API. Implementation lives in `src/data/repo/*` by entity;
 * keep importing from this module so call sites stay stable.
 */

export type { Db } from '#/data/repo/db'
export { bootstrapApp, bootstrapDatabase } from '#/data/repo/db'

export {
  getSettings,
  completeOnboarding,
  updateSettings,
  getMonthBudget,
  setMonthBudget,
  clearMonthBudget,
} from '#/data/repo/settings'

export {
  listCategories,
  listCategoriesWithUsage,
  createCategory,
  updateCategory,
  deleteCategory,
} from '#/data/repo/categories'

export {
  listPaymentMethods,
  listPaymentMethodsWithUsage,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from '#/data/repo/payment-methods'

export type { ListTransactionsFilters } from '#/data/repo/transactions'
export {
  listTransactions,
  listRecentTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactionsForRecurring,
} from '#/data/repo/transactions'

export type {
  RecordRecurringOverrides,
  RecordRecurringResult,
} from '#/data/repo/recurring'
export {
  listRecurring,
  createRecurring,
  updateRecurring,
  setRecurringActive,
  deleteRecurring,
  recordRecurringPayment,
  skipRecurringOccurrence,
} from '#/data/repo/recurring'

export {
  listSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  recordSavingsContribution,
} from '#/data/repo/savings'

export { getOverview } from '#/data/repo/overview'
