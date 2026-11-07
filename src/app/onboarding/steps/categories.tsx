import { Button } from '#/components/ui/button'
import { expenseCategories } from '#/data/sample-ledger'
import { cn } from 'cn'

type CategoriesStepProps = {
  headingId: string
  selectedExpenses: string[]
  mutationPending: boolean
  mutationError: string | null
  onToggleExpense: (name: string) => void
  onSelectCommon: () => void
  onClear: () => void
  onFinish: () => void
  onBack: () => void
}

export function CategoriesStep({
  headingId,
  selectedExpenses,
  mutationPending,
  mutationError,
  onToggleExpense,
  onSelectCommon,
  onClear,
  onFinish,
  onBack,
}: CategoriesStepProps) {
  return (
    <>
      <div className="space-y-2">
        <h1
          id={headingId}
          className="text-pretty text-2xl font-semibold tracking-tight text-foreground"
        >
          Categories
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Pick expense tags to start with. Income is always included. You can
          add more anytime — including income types like Salary or Freelance.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pressable"
          onClick={onSelectCommon}
        >
          Select common
        </Button>
        {selectedExpenses.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="pressable"
            onClick={onClear}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="group"
        aria-label="Expense categories"
      >
        {expenseCategories.map((name) => {
          const selected = selectedExpenses.includes(name)
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggleExpense(name)}
              className={cn(
                'pressable min-h-11 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                selected
                  ? 'border-ring/60 bg-secondary font-medium ring-2 ring-ring/30'
                  : 'hover:bg-muted',
              )}
              aria-pressed={selected}
            >
              {name}
            </button>
          )
        })}
      </div>

      {mutationError ? (
        <p className="text-sm text-destructive" role="alert">
          {mutationError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3">
        <Button
          size="lg"
          className="pressable min-h-11 w-full"
          disabled={mutationPending}
          onClick={onFinish}
        >
          {mutationPending ? 'Setting up…' : 'Finish setup'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="pressable min-h-11 w-full"
          disabled={mutationPending}
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </>
  )
}
