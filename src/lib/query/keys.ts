export const queryKeys = {
  settings: ['settings'] as const,
  onboarding: ['onboarding'] as const,
  transactions: ['transactions'] as const,
  recurring: ['recurring'] as const,
  categories: ['categories'] as const,
  categoriesUsage: ['categories', 'usage'] as const,
  paymentMethods: ['paymentMethods'] as const,
  paymentMethodsUsage: ['paymentMethods', 'usage'] as const,
  overview: ['overview'] as const,
  overviewMonth: (yearMonth: string) => ['overview', yearMonth] as const,
}
