export type { Db } from '#/data/repo/db'
export { bootstrapApp, bootstrapDatabase } from '#/data/repo/db'

export {
  getSettings,
  completeOnboarding,
  loadSampleData,
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
  listAccounts,
  listAccountsWithBalances,
  createAccount,
  updateAccount,
  closeAccount,
  deleteAccount,
} from '#/data/repo/accounts'

export type { ListTransactionsFilters } from '#/data/repo/transactions'
export {
  listTransactions,
  summarizeTransactions,
  listAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactionsForRecurring,
} from '#/data/repo/transactions'

export {
  createTransfer,
  updateTransfer,
  getTransferPair,
  repairOrphanTransfers,
} from '#/data/repo/transfers'

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

export { getOverview, getYearOverview } from '#/data/repo/overview'
export type { YearOverview } from '#/data/repo/overview'
