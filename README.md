# Expense Tracker

A personal, local-only expense tracker. Everything runs in the browser and is stored in SQLite (SQLocal / OPFS) on your device — no accounts, no cloud sync.

## Features

- **Overview** — this month’s income and expenses, budget left / used, category breakdown, accounts / net worth, upcoming recurring
- **Ledger** — add, edit, delete, filter, and search transactions; transfers move money between accounts as a linked pair
- **Accounts** — named balances (cash, cards, bank) with type, starting balance, and close; used on expenses/income and transfers
- **Recurring** — weekly / monthly / yearly bills with active toggle and budget impact
- **Savings** — goals with progress, funding from income, optional target dates
- **Categories** — manage income and expense categories; deletes reassign related items
- **Budget & currency** — set monthly budget and display currency from Overview
- **Onboarding** — first visit wizard: currency, budget, and first account (or restore a backup)
- **Theme** — light, dark, or system (circular bloom on toggle where View Transitions allow)
- **Phone (Android)** — installable PWA in Chrome; bottom tab navigation on small screens

## Requirements

- Node.js 22+ and [pnpm](https://pnpm.io)
- A Chromium-based browser with OPFS. The app serves COOP/COEP headers so SQLite can persist in OPFS.

See **[docs/opfs-and-cross-origin-isolation.md](docs/opfs-and-cross-origin-isolation.md)** for what OPFS is, why those headers are required, backups/export, and how to debug a stuck “Loading…” screen after preview or deploy.

Phone install and iOS caveats: **[docs/mobile.md](docs/mobile.md)**.

**Backups:** Overview → Budget → Export backup (`.sqlite3`). Restore from the same dialog. Prefer Chrome/Edge in a normal window — private mode and clearing site data can erase the ledger. Desktop and phone each keep a **separate** local database unless you export/import.

## Demo (Vercel)

Live demo: **[https://expense-tracker-amber-two-58.vercel.app](https://expense-tracker-amber-two-58.vercel.app)**

Root [`vercel.json`](vercel.json) sets isolation and baseline security headers so OPFS works on the CDN path. Linked project: `linux-res-projects/expense-tracker` (GitHub connected).

```bash
curl -sI https://expense-tracker-amber-two-58.vercel.app/ | grep -iE 'cross-origin|x-content-type'
```

In the browser: `window.crossOriginIsolated` should be `true`. Open the URL in **Chrome on Android** → Install app / Add to Home Screen.

Preview deployments get their own origin (and therefore their own empty OPFS DB).

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

On first visit, the app host shows a short setup wizard (currency, monthly budget, first account, expense categories) or restore-from-backup. Income is always seeded; you pick expense tags (or none) and can add more income types later on Categories. With one account, new entries use it automatically and Transfer stays hidden until you add another. Marketing CTAs use `/?from=mkt` so setup starts without a second landing page. After setup, screens read and write the local DB through TanStack Query and `src/data/repository.ts`.

To see onboarding again in development, clear site data for localhost (Application → Storage → Clear site data).

```bash
pnpm build
pnpm preview   # Nitro Node server (applies COEP to HTML + /assets)
```

## Project layout

| Path                                 | Role                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `src/app/`                           | App shell: gate, nav, theme, onboarding                                        |
| `src/routes/`                        | Screens: Overview, Ledger, Recurring, Savings, Categories                      |
| `src/features/`                      | Domain UI (ledger, overview, recurring, categories, savings, settings, shared) |
| `src/components/ui/`                 | shadcn primitives                                                              |
| `src/components/layout/`             | Page shell, header, month nav, empty / loading                                 |
| `src/components/landing/`            | Marketing site pages                                                           |
| `src/data/`                          | Public `repository.ts` barrel, seed, sample ledger                             |
| `src/data/repo/`                     | Entity modules (settings, transactions, savings, …)                            |
| `src/db/`                            | Drizzle schema + browser SQLite client + migrator                              |
| `drizzle/`                           | Kit-generated SQL + `migrations.js` (commit these)                             |
| `src/lib/`                           | Domain helpers (`finance/`, forms, savings, motion)                            |
| `src/lib/query/`                     | Query keys, invalidation, route prefetch                                       |
| `src/styles/`                        | Ordered CSS modules (`00`–`70`); entry is `styles.css`                         |
| `src/features/shared/local-data.tsx` | Persistence callout + backup UI                                                |
| `src/data/backup.ts`                 | Export / restore SQLite file                                                   |
| `server/plugins/`                    | Nitro plugins (cross-origin isolation headers)                                 |
| `public/`                            | PWA manifest + icons                                                           |
| `vercel.json`                        | Vercel COEP/security headers                                                   |
| `docs/`                              | Operator notes (OPFS / COEP, mobile)                                           |
| `tests/unit/`                        | Vitest unit tests                                                              |
| `e2e/`                               | Playwright critical-path specs                                                 |

## Data model

| Table                | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `settings`           | Default monthly budget, currency, onboarding flag   |
| `monthly_budgets`    | Optional per-month budget overrides (`YYYY-MM`)     |
| `categories`         | Income / expense categories                         |
| `payment_methods`    | Accounts (balances); table name kept for migrations |
| `transactions`       | Ledger entries (expense / income / transfer legs)   |
| `recurring_expenses` | Recurring bills                                     |
| `savings_goals`      | Savings goals (target, current, optional date)      |

## Scripts

| Script                     | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `pnpm dev`                 | Dev server on port 3000                               |
| `pnpm build`               | Production build                                      |
| `pnpm preview`             | Preview production build                              |
| `pnpm test`                | Run unit tests                                        |
| `pnpm lint` / `pnpm check` | ESLint / Prettier                                     |
| `pnpm db:generate`         | Generate Drizzle migrations from `schema.ts`          |
| `pnpm db:studio`           | Drizzle Studio (CLI SQLite; app UI uses browser OPFS) |

## Stack

- TanStack Start, Router, Query
- React 19, Vite
- shadcn/ui + Tailwind CSS 4
- Drizzle ORM + SQLocal (browser SQLite)
