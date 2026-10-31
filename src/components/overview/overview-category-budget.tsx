import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ChartPie, List, ChevronDown } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { CategorySpendChart } from '#/components/category-spend-chart'
import { EmptyState } from '#/components/layout/empty-state'
import { Button } from '#/components/ui/button'
import { money } from '#/lib/finance'
import { writeCategoryView } from '#/lib/overview-helpers'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import { prefetchRoute } from '#/lib/query/prefetch'
import type { CategoryView } from '#/lib/overview-helpers'
import { useIsMobile } from '#/hooks/use-media-query'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '#/components/ui/collapsible'
import { cn } from 'cn'

export type OverviewCategoryRow = {
  name: string
  amount: number
  ofBudget: number
  categoryId: string
}

type OverviewCategoryBudgetProps = {
  yearMonth: string
  monthLabel: string
  currency: string
  budget: number
  categories: OverviewCategoryRow[]
  categoryView: CategoryView
  onCategoryViewChange: (view: CategoryView) => void
}

export function OverviewCategoryBudget({
  yearMonth,
  monthLabel,
  currency,
  budget,
  categories,
  categoryView,
  onCategoryViewChange,
}: OverviewCategoryBudgetProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const isMobile = useIsMobile()

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base">Categories vs budget</CardTitle>
        <CardDescription>
          {categoryView === 'chart'
            ? `Spend vs ${money(budget, currency)}`
            : `Share of this month's budget`}
        </CardDescription>
        {categories.length > 0 ? (
          <CardAction>
            {isMobile ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 hover-lift"
                    aria-label={categoryView === 'chart' ? 'Switch to list view' : 'Switch to chart view'}
                  >
                    {categoryView === 'chart' ? (
                      <>
                        <ChartPie className="size-3.5" aria-hidden />
                        <span>Chart</span>
                      </>
                    ) : (
                      <>
                        <List className="size-3.5" aria-hidden />
                        <span>List</span>
                      </>
                    )}
                    <ChevronDown className="size-3.5" aria-hidden />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 flex gap-1">
                  <TabsTrigger
                    value="list"
                    className="gap-1.5 px-2.5 text-xs hover-lift"
                    onClick={() => {
                      onCategoryViewChange('list')
                      writeCategoryView('list')
                    }}
                  >
                    <List className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="chart"
                    className="gap-1.5 px-2.5 text-xs hover-lift"
                    onClick={() => {
                      onCategoryViewChange('chart')
                      writeCategoryView('chart')
                    }}
                  >
                    <ChartPie className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">Chart</span>
                  </TabsTrigger>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Tabs
                value={categoryView}
                onValueChange={(value) => {
                  const next = value === 'chart' ? 'chart' : 'list'
                  onCategoryViewChange(next)
                  writeCategoryView(next)
                }}
              >
                <TabsList variant="default" className="h-8">
                  <TabsTrigger
                    value="list"
                    className="gap-1.5 px-2.5 text-xs hover-lift"
                    aria-label="List view"
                  >
                    <List className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="chart"
                    className="gap-1.5 px-2.5 text-xs hover-lift"
                    aria-label="Chart view"
                  >
                    <ChartPie className="size-3.5" aria-hidden />
                    <span className="hidden sm:inline">Chart</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 py-4">
        {categories.length === 0 ? (
          <EmptyState
            compact
            icon={<ChartPie />}
            title="No spend by category yet"
            description={`${monthLabel} expenses will show up here.`}
          />
        ) : categoryView === 'chart' ? (
          <CategorySpendChart
            categories={categories}
            budget={budget}
            currency={currency}
          />
        ) : (
          categories.map((category) => (
            <Link
              key={category.categoryId || category.name}
              to="/ledger"
              search={{
                month: yearMonth,
                ...(category.categoryId
                  ? { category: category.categoryId }
                  : {}),
              }}
              className={cn(
                'flex flex-col gap-1 rounded-md outline-none transition-colors',
                'hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
                'px-3 py-2 md:px-4 md:py-3'
              )}
              onMouseEnter={() => prefetchRoute(queryClient, '/ledger', { month: yearMonth })}
              onClick={(event) => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                void navigateAfterPrefetch(router, queryClient, {
                  to: '/ledger',
                  search: {
                    month: yearMonth,
                    ...(category.categoryId ? { category: category.categoryId } : {}),
                  },
                  month: yearMonth,
                })
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {money(category.amount, currency)} ·{' '}
                  {category.ofBudget * 100 >= 1
                    ? `${(category.ofBudget * 100).toFixed(1)}%`
                    : '<1%'}
                </span>
              </div>
              <Progress
                className="h-1"
                value={Math.min(category.ofBudget * 100, 100)}
                aria-label={`${category.name} share of budget`}
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}