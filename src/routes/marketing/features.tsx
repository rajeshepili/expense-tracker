import type { CSSProperties } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BellRing,
  CalendarRange,
  ListOrdered,
  PiggyBank,
  Receipt,
  Wallet,
} from 'lucide-react'
import { MarketingPage } from '#/components/landing/marketing-page'
import { APP_SETUP_URL, SITE_MODE } from '#/lib/brand'

export const Route = createFileRoute('/features')({
  component: FeaturesPage,
})

type Section = {
  icon: React.ReactNode
  title: string
  body: string
  visual: React.ReactNode
  flip?: boolean
}

function LedgerVisual() {
  return (
    <div className="mkt-section-visual" aria-hidden>
      <ul className="mkt-list">
        {[
          {
            name: 'Grocery run',
            meta: 'Food · Today',
            amount: '−$64.20',
            tone: 'text-expense',
          },
          {
            name: 'Monthly salary',
            meta: 'Income · Yesterday',
            amount: '+$4,200.00',
            tone: 'text-income',
          },
          {
            name: 'Top up spending card',
            meta: 'Transfer · 2 legs',
            amount: '$200.00',
            tone: '',
          },
        ].map((row) => (
          <li key={row.name} className="mkt-list-row">
            <span>
              {row.name} <span className="mkt-list-meta">· {row.meta}</span>
            </span>
            <span className={`mkt-list-amount tabular-nums ${row.tone}`}>
              {row.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BillsVisual() {
  return (
    <div className="mkt-section-visual" aria-hidden>
      <div className="mkt-stat-grid">
        <div className="mkt-stat">
          <span className="mkt-stat-label">Upcoming bills</span>
          <span className="mkt-stat-value text-expense">−$1,349.99</span>
        </div>
        <div className="mkt-stat">
          <span className="mkt-stat-label">Expected income</span>
          <span className="mkt-stat-value text-income">+$4,200.00</span>
        </div>
      </div>
      <ul className="mkt-list">
        {[
          { name: 'Studio rent', meta: 'in 2 days', amount: '−$1,200.00' },
          { name: 'Streaming', meta: 'in 4 days', amount: '−$15.99' },
        ].map((row) => (
          <li key={row.name} className="mkt-list-row">
            <span>
              {row.name} <span className="mkt-list-meta">· {row.meta}</span>
            </span>
            <span className="mkt-list-amount tabular-nums text-expense">
              {row.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function YearVisual() {
  const bars = [62, 55, 70, 48, 66, 58, 74, 52, 60, 49, 68, 41]
  return (
    <div className="mkt-section-visual" aria-hidden>
      <div className="mkt-stat-grid" style={{ marginBottom: '0.75rem' }}>
        <div className="mkt-stat">
          <span className="mkt-stat-label">2026 expenses</span>
          <span className="mkt-stat-value text-expense">$18,430</span>
        </div>
        <div className="mkt-stat">
          <span className="mkt-stat-label">2026 income</span>
          <span className="mkt-stat-value text-income">+$50,400</span>
        </div>
      </div>
      <div className="flex h-24 items-end gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t-sm"
            style={{
              height: `${h}%`,
              background:
                'color-mix(in oklch, var(--ring) 55%, var(--foreground))',
            }}
          />
        ))}
      </div>
    </div>
  )
}

const SECTIONS: Section[] = [
  {
    icon: <Receipt aria-hidden />,
    title: 'Ledger with real context',
    body: 'Every entry has a category, an account, and a date. Filter by type, search instantly, and move money between accounts as linked transfer pairs.',
    visual: <LedgerVisual />,
  },
  {
    icon: <BellRing aria-hidden />,
    title: 'Bills that remind you — and predict the month',
    body: 'Recurring expenses and income with due-date reminders (local notifications, nothing leaves the device), plus a month-end projection: what you will likely have left after upcoming bills.',
    visual: <BillsVisual />,
    flip: true,
  },
  {
    icon: <PiggyBank aria-hidden />,
    title: 'Savings goals with progress',
    body: 'Set targets with optional deadlines, add progress, and get prompted to fund a goal when matching income lands.',
    visual: (
      <div className="mkt-section-visual" aria-hidden>
        <div className="mkt-stat-grid">
          <div className="mkt-stat">
            <span className="mkt-stat-label">Emergency fund</span>
            <span className="mkt-stat-value">$300 / $3,000</span>
          </div>
          <div className="mkt-stat">
            <span className="mkt-stat-label">Progress</span>
            <span className="mkt-stat-value">10%</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Wallet aria-hidden />,
    title: 'Accounts and net worth',
    body: 'Named accounts for cash, cards, and banks with starting balances — the Overview shows your net worth at a glance.',
    visual: (
      <div className="mkt-section-visual" aria-hidden>
        <div className="mkt-stat-grid">
          <div className="mkt-stat">
            <span className="mkt-stat-label">Net worth</span>
            <span className="mkt-stat-value">+$3,680.00</span>
          </div>
          <div className="mkt-stat">
            <span className="mkt-stat-label">Accounts</span>
            <span className="mkt-stat-value">5</span>
          </div>
        </div>
        <ul className="mkt-list">
          {['Bank transfer', 'Debit card', 'Credit card'].map((name) => (
            <li key={name} className="mkt-list-row">
              <span>{name}</span>
              <span className="mkt-list-amount tabular-nums">…</span>
            </li>
          ))}
        </ul>
      </div>
    ),
    flip: true,
  },
  {
    icon: <CalendarRange aria-hidden />,
    title: 'A year in review',
    body: 'The year view charts income vs expenses for all 12 months with your top spending categories — the Jahresrückblick, no bank connection needed.',
    visual: <YearVisual />,
  },
  {
    icon: <ListOrdered aria-hidden />,
    title: 'Your data, exportable',
    body: 'One click exports a .sqlite3 backup or a plain CSV of the whole ledger. Restore anytime. Duplicate charges get flagged when you enter them.',
    visual: (
      <div className="mkt-section-visual" aria-hidden>
        <ul className="mkt-list">
          {[
            { name: 'Export backup', meta: '.sqlite3', amount: '↧' },
            { name: 'Export CSV', meta: 'spreadsheet-ready', amount: '↧' },
          ].map((row) => (
            <li key={row.name} className="mkt-list-row">
              <span>
                {row.name} <span className="mkt-list-meta">· {row.meta}</span>
              </span>
              <span className="mkt-list-amount">{row.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
    flip: true,
  },
]

function FeaturesPage() {
  return (
    <MarketingPage
      eyebrow="What's inside"
      title="Everything a ledger needs, nothing it doesn't"
      description="Pocketbook runs entirely in your browser. No account, no sync, no subscription — the features below all work offline from local data."
      cta={
        SITE_MODE === 'marketing'
          ? { label: 'Get started', href: APP_SETUP_URL }
          : undefined
      }
    >
      <div className="mkt-sections">
        {SECTIONS.map((section, i) => (
          <section
            key={section.title}
            className={`mkt-section${section.flip ? ' mkt-section--flip' : ''}`}
            style={{ '--mkt-i': i } as CSSProperties}
            aria-label={section.title}
          >
            <div className="mkt-section-copy">
              <span className="mkt-section-icon">{section.icon}</span>
              <h2 className="mkt-section-title">{section.title}</h2>
              <p className="mkt-section-body">{section.body}</p>
            </div>
            {section.visual}
          </section>
        ))}
      </div>
    </MarketingPage>
  )
}
