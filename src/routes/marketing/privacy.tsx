import type { CSSProperties } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MarketingPage } from '#/components/landing/marketing-page'
import { APP_SETUP_URL, SITE_MODE } from '#/lib/brand'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

const QA: Array<{ q: string; a: string }> = [
  {
    q: 'Where does my data live?',
    a: 'In your browser only. The ledger is a SQLite database stored in OPFS (Origin Private File System) — a storage area Chrome reserves for this exact site. It never leaves the device.',
  },
  {
    q: 'Is there an account or cloud sync?',
    a: 'No. There is no sign-up, no server, no analytics, no tracking, no ads. The marketing site (this one) stores nothing; the app runs on its own host and keeps everything local to it.',
  },
  {
    q: 'What happens if I clear site data or switch browsers?',
    a: 'The ledger is erased, same as clearing any site\u2019s data. That is why Backup → Export gives you a .sqlite3 file you can restore, and Export CSV gives you a spreadsheet copy. Desktop and phone are separate copies unless you restore a backup.',
  },
  {
    q: 'Which browsers work?',
    a: 'Chrome or Edge on desktop, Chrome on Android (installable as a home-screen app). Private / incognito windows don\u2019t persist OPFS, so use a normal window. Safari on iOS is not supported yet.',
  },
  {
    q: 'Are notifications sent anywhere?',
    a: 'No. Bill reminders are generated locally by the app\u2019s service worker and shown by your own browser. They require your permission, and you can turn them off in Backup → Bill reminders.',
  },
  {
    q: 'Can I see the code?',
    a: 'Yes — the project is open source on GitHub (rajeshepili/expense-tracker). Everything runs client-side; there is no backend to trust.',
  },
]

function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Privacy"
      title="Your money data never leaves your device"
      description="No account, no cloud, no tracking. Here is exactly what that means in practice."
      cta={
        SITE_MODE === 'marketing'
          ? { label: 'Get started', href: APP_SETUP_URL }
          : undefined
      }
    >
      <div className="mkt-qa">
        {QA.map((item, i) => (
          <div
            key={item.q}
            className="mkt-qa-item"
            style={{ '--mkt-i': i } as CSSProperties}
          >
            <p className="mkt-qa-q">{item.q}</p>
            <p className="mkt-qa-a">{item.a}</p>
          </div>
        ))}
      </div>
    </MarketingPage>
  )
}
