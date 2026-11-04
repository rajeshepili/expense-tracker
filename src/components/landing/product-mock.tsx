import type { CSSProperties } from 'react'
import { cn } from 'cn'

const ROWS = [
  { name: 'Payroll', meta: 'Income · Today', amount: '+$3,200.00', tone: 'income' as const },
  { name: 'Studio rent', meta: 'Housing · Mar 1', amount: '−$1,200.00', tone: 'expense' as const },
  { name: 'Groceries', meta: 'Food · Mar 3', amount: '−$84.20', tone: 'expense' as const },
  { name: 'Transit pass', meta: 'Transport · Mar 5', amount: '−$89.00', tone: 'expense' as const },
]

/** Decorative Overview chrome — not live data. */
export function LandingProductMock({ className }: { className?: string }) {
  return (
    <div className={cn('landing-mock', className)} aria-hidden>
      <div className="landing-mock-chrome">
        <div className="landing-mock-header">
          <span className="landing-mock-title">Overview</span>
          <span className="landing-mock-month">March 2026</span>
        </div>

        <div className="landing-mock-stats">
          <div className="landing-mock-stat">
            <span className="landing-mock-stat-label">Income</span>
            <span className="landing-mock-stat-value text-income">$3,200</span>
          </div>
          <div className="landing-mock-stat">
            <span className="landing-mock-stat-label">Expenses</span>
            <span className="landing-mock-stat-value text-expense">$1,373</span>
          </div>
          <div className="landing-mock-stat">
            <span className="landing-mock-stat-label">Left</span>
            <span className="landing-mock-stat-value">$1,127</span>
          </div>
          <div className="landing-mock-stat">
            <span className="landing-mock-stat-label">Used</span>
            <span className="landing-mock-stat-value">55%</span>
          </div>
        </div>

        <div className="landing-mock-budget">
          <div className="landing-mock-budget-track">
            <div className="landing-mock-budget-fill" />
          </div>
          <p className="landing-mock-budget-caption">$1,373 of $2,500 budget</p>
        </div>

        <ul className="landing-mock-rows">
          {ROWS.map((row, index) => (
            <li
              key={row.name}
              className="landing-mock-row"
              style={{ '--landing-row-i': index } as CSSProperties}
            >
              <div className="landing-mock-row-text">
                <span className="landing-mock-row-name">{row.name}</span>
                <span className="landing-mock-row-meta">{row.meta}</span>
              </div>
              <span
                className={cn(
                  'landing-mock-row-amount tabular-nums',
                  row.tone === 'income' ? 'text-income' : 'text-expense',
                )}
              >
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
