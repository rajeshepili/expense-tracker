import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Target, ArrowRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { prefetchRoute } from '#/lib/query/prefetch'
import { navigateAfterPrefetch } from '#/lib/navigate-after-prefetch'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { EmptyState } from '#/components/layout/empty-state'
import {
  CompletedGoalRow,
  SavingsGoalCard,
} from '#/features/savings/savings-goal-card'
import { percent } from '#/lib/finance'
import { useSavingsList } from '#/lib/savings-list'

export function SavingsSummary() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { goals, activeGoals, completedGoals, currency } = useSavingsList()
  const prefetchSavings = () => prefetchRoute(queryClient, '/savings')

  function openSavings() {
    prefetchSavings()
    void navigateAfterPrefetch(router, queryClient, { to: '/savings' })
  }

  if (goals.length === 0) {
    return (
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">Savings goals</CardTitle>
          <CardDescription>
            Track progress toward specific targets.
          </CardDescription>
          <CardAction>
            <Button asChild size="sm">
              <Link
                to="/savings"
                search={{ new: true }}
                onMouseEnter={prefetchSavings}
                onFocus={prefetchSavings}
              >
                <Target data-icon="inline-start" className="mr-1.5" />
                Add goal
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <EmptyState
            compact
            icon={<Target />}
            title="No savings goals yet"
            description="Set a target amount and optional deadline."
            action={
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link
                  to="/savings"
                  search={{ new: true }}
                  onMouseEnter={prefetchSavings}
                  onFocus={prefetchSavings}
                >
                  <Target data-icon="inline-start" />
                  Create goal
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0)
  const overallProgress =
    totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-base">Savings goals</CardTitle>
        <CardDescription>
          {activeGoals.length} active
          {completedGoals.length > 0
            ? ` · ${completedGoals.length} completed`
            : ''}
          {goals.length > 0
            ? ` · ${percent(overallProgress / 100)} overall`
            : ''}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/savings"
              onMouseEnter={prefetchSavings}
              onFocus={prefetchSavings}
            >
              <ArrowRight className="size-4" />
              <span className="hidden sm:inline">Manage</span>
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 py-4">
        {activeGoals.length > 0 ? (
          <div className="space-y-3">
            {activeGoals.slice(0, 2).map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                currency={currency}
                onOpen={openSavings}
              />
            ))}
            {activeGoals.length > 2 && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-foreground"
              >
                <Link
                  to="/savings"
                  onMouseEnter={prefetchSavings}
                  onFocus={prefetchSavings}
                >
                  View all {activeGoals.length} active goals
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        ) : null}
        {activeGoals.length === 0 && completedGoals.length > 0 ? (
          <div className="space-y-2">
            {completedGoals.slice(0, 2).map((goal) => (
              <CompletedGoalRow
                key={goal.id}
                goal={goal}
                onOpen={openSavings}
              />
            ))}
            {completedGoals.length > 2 && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-foreground"
              >
                <Link
                  to="/savings"
                  onMouseEnter={prefetchSavings}
                  onFocus={prefetchSavings}
                >
                  View all {completedGoals.length} completed goals
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
