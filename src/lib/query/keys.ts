export type TransactionsListKey = {
  month?: string
  categoryId?: string
  paymentMethodId?: string
  accountId?: string
  type?: 'income' | 'expense' | 'transfer'
  q?: string
  limit?: number
  offset?: number
}

export type TransactionsSummaryKey = {
  month?: string
  categoryId?: string
  paymentMethodId?: string
  accountId?: string
  type?: 'income' | 'expense' | 'transfer'
  q?: string
}

export const queryKeys = {
  settings: ['settings'] as const,
  onboarding: ['onboarding'] as const,
  transactions: ['transactions'] as const,
  transactionsList: (filters: TransactionsListKey) =>
    ['transactions', 'list', filters] as const,
  transactionsSummary: (filters: TransactionsSummaryKey) =>
    ['transactions', 'summary', filters] as const,
  recurring: ['recurring'] as const,
  recurringTransactions: (recurringId: string) =>
    ['recurring', recurringId, 'transactions'] as const,
  categories: ['categories'] as const,
  categoriesUsage: ['categories', 'usage'] as const,
  accounts: ['accounts'] as const,
  accountsUsage: ['accounts', 'usage'] as const,
  /** @deprecated use accounts */
  paymentMethods: ['paymentMethods'] as const,
  /** @deprecated use accountsUsage */
  paymentMethodsUsage: ['paymentMethods', 'usage'] as const,
  savingsGoals: ['savingsGoals'] as const,
  overview: ['overview'] as const,
  overviewMonth: (yearMonth: string) => ['overview', yearMonth] as const,
  /** Granular slices under overviewMonth — invalidate selectively after writes. */
  overviewSummary: (yearMonth: string) =>
    ['overview', yearMonth, 'summary'] as const,
  overviewCategorySpend: (yearMonth: string) =>
    ['overview', yearMonth, 'categorySpend'] as const,
  overviewRecent: (yearMonth: string) =>
    ['overview', yearMonth, 'recent'] as const,
  overviewAccounts: ['overview', 'accounts'] as const,
  overviewYear: (year: string) => ['overview', 'year', year] as const,
}
