import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ModeToggle } from '#/app/mode-toggle'
import { restoreBackup } from '#/data/backup'
import { COMMON_EXPENSE_CATEGORIES } from '#/data/seed'
import { completeOnboarding } from '#/data/repository'
import { APP_NAME } from '#/lib/brand'
import { money } from '#/lib/finance'
import { animateWizardStep } from '#/lib/motion'
import { invalidateAfter } from '#/lib/query/invalidation'
import type { AccountType } from '#/lib/types'
import { clearFromMktParam, fromMarketingHandoff, stepMeta } from './shared'
import type { WizardStep } from './shared'
import { AccountStep } from './steps/account'
import { CategoriesStep } from './steps/categories'
import { MoneyStep } from './steps/money'
import { WelcomeStep } from './steps/welcome'

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient()
  const [fromMkt] = useState(() => fromMarketingHandoff())
  const [step, setStep] = useState<WizardStep>(() =>
    fromMarketingHandoff() ? 'money' : 'welcome',
  )
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const panelRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  const [currency, setCurrency] = useState('USD')
  const [budget, setBudget] = useState('2500')
  const [accountName, setAccountName] = useState('Checking')
  const [accountType, setAccountType] = useState<AccountType>('asset')
  const [startingBalance, setStartingBalance] = useState('0')
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restorePending, setRestorePending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (fromMkt) clearFromMktParam()
  }, [fromMkt])

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    animateWizardStep(el, direction)
    const focusable = el.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus({ preventScroll: true })
  }, [step, direction])

  const mutation = useMutation({
    mutationFn: async () => {
      const amount = Number(budget)
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Enter a valid monthly budget (0 or more)')
      }
      const code = currency.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(code)) {
        throw new Error('Choose a valid currency')
      }
      try {
        money(0, code)
      } catch {
        throw new Error('Choose a valid currency')
      }
      const balance = Number(startingBalance)
      if (!Number.isFinite(balance) || balance < 0) {
        throw new Error('Enter a valid starting balance (0 or more)')
      }
      const name = accountName.trim()
      if (!name) throw new Error('Enter an account name')

      await completeOnboarding({
        budget: amount,
        currency: code,
        primaryAccount: {
          name,
          type: accountType,
          startingBalance: balance,
        },
        expenseCategoryNames: selectedExpenses,
      })
    },
    onSuccess: async () => {
      await invalidateAfter(queryClient, [
        'settings',
        'transactions',
        'recurring',
        'categories',
        'paymentMethods',
        'accounts',
      ])
      onComplete()
    },
  })

  function go(next: WizardStep, dir: 'forward' | 'back') {
    setDirection(dir)
    setStep(next)
  }

  function toggleExpense(name: string) {
    setSelectedExpenses((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    )
  }

  function selectCommon() {
    setSelectedExpenses([...COMMON_EXPENSE_CATEGORIES])
  }

  async function onRestoreFile(file: File | undefined) {
    if (!file) return
    setRestoreError(null)
    setRestorePending(true)
    try {
      await restoreBackup(file)
    } catch (err) {
      setRestorePending(false)
      setRestoreError(
        err instanceof Error ? err.message : 'Could not restore backup',
      )
    }
  }

  const { index: stepIndex, total: stepTotal } = stepMeta(step, fromMkt)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-10 pt-[max(1rem,var(--safe-top))]">
      <header className="flex items-center justify-between gap-3 py-3">
        <span className="brand-wordmark text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </span>
        <ModeToggle />
      </header>

      <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">
        Step {stepIndex} of {stepTotal}
      </p>

      <div
        ref={panelRef}
        className="flex flex-1 flex-col gap-6"
        aria-labelledby={headingId}
      >
        {step === 'welcome' ? (
          <WelcomeStep
            headingId={headingId}
            restorePending={restorePending}
            restoreError={restoreError}
            onContinue={() => go('money', 'forward')}
            onRestoreClick={() => fileInputRef.current?.click()}
          />
        ) : null}

        {step === 'money' ? (
          <MoneyStep
            headingId={headingId}
            fromMkt={fromMkt}
            currency={currency}
            budget={budget}
            restorePending={restorePending}
            restoreError={restoreError}
            onCurrencyChange={setCurrency}
            onBudgetChange={setBudget}
            onContinue={() => go('account', 'forward')}
            onBack={() => go('welcome', 'back')}
            onRestoreClick={() => fileInputRef.current?.click()}
          />
        ) : null}

        {step === 'account' ? (
          <AccountStep
            headingId={headingId}
            currency={currency}
            accountName={accountName}
            accountType={accountType}
            startingBalance={startingBalance}
            onAccountNameChange={setAccountName}
            onAccountTypeChange={setAccountType}
            onStartingBalanceChange={setStartingBalance}
            onContinue={() => go('categories', 'forward')}
            onBack={() => go('money', 'back')}
          />
        ) : null}

        {step === 'categories' ? (
          <CategoriesStep
            headingId={headingId}
            selectedExpenses={selectedExpenses}
            mutationPending={mutation.isPending}
            mutationError={mutation.isError ? mutation.error.message : null}
            onToggleExpense={toggleExpense}
            onSelectCommon={selectCommon}
            onClear={() => setSelectedExpenses([])}
            onFinish={() => mutation.mutate()}
            onBack={() => go('account', 'back')}
          />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite3,.db,application/x-sqlite3,application/octet-stream"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void onRestoreFile(file)
        }}
      />
    </div>
  )
}
