export type TransactionsListKey = {
  month?: string
  categoryId?: string
  paymentMethodId?: string
  type?: 'income' | 'expense'
  q?: string
  limit?: number
}

export const queryKeys = {
  settings: ['settings'] as const,
  onboarding: ['onboarding'] as const,
  transactions: ['transactions'] as const,
  transactionsList: (filters: TransactionsListKey) =>
    ['transactions', 'list', filters] as const,
  recurring: ['recurring'] as const,
  recurringTransactions: (recurringId: string) =>
    ['recurring', recurringId, 'transactions'] as const,
  categories: ['categories'] as const,
  categoriesUsage: ['categories', 'usage'] as const,
  paymentMethods: ['paymentMethods'] as const,
  paymentMethodsUsage: ['paymentMethods', 'usage'] as const,
  savingsGoals: ['savingsGoals'] as const,
  overview: ['overview'] as const,
  overviewMonth: (yearMonth: string) => ['overview', yearMonth] as const,
}
