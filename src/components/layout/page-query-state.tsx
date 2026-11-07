import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/layout/page-header'
import { PageShell } from '#/components/layout/page-shell'
import {
  CategoriesPageSkeleton,
  LedgerPageSkeleton,
  ListRowsSkeleton,
  RecurringPageSkeleton,
  SavingsPageSkeleton,
} from '#/components/layout/page-skeletons'
import type { ReactNode } from 'react'

type PageLoadingVariant =
  'default' | 'ledger' | 'recurring' | 'categories' | 'savings'

const skeletons: Record<PageLoadingVariant, ReactNode> = {
  default: <ListRowsSkeleton rows={6} />,
  ledger: <LedgerPageSkeleton />,
  recurring: <RecurringPageSkeleton />,
  categories: <CategoriesPageSkeleton />,
  savings: <SavingsPageSkeleton />,
}

export function PageLoading({
  label,
  variant = 'default',
}: {
  label: string
  variant?: PageLoadingVariant
}) {
  return (
    <PageShell
      scroll="page"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {skeletons[variant]}
    </PageShell>
  )
}

export function PageError({
  title,
  message,
  onRetry,
}: {
  title: string
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <PageShell scroll="page" role="alert">
      <PageHeader title={title} />
      <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          {message?.trim() || 'Something went wrong. Try again.'}
        </p>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </PageShell>
  )
}
