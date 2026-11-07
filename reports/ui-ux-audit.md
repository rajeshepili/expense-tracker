# Full App UI/UX Audit

**Date:** 2026-11-03  
**Lenses:** apple-design · emil-design-eng · webapp-ui (`audit` mode)  
**Mode:** Ranked fix brief only — no product UI changes in this pass.

---

## Output shape

```text
Surface: full app (shell, Overview, Ledger, Recurring, Savings, Categories/Accounts,
         composers/modals, onboarding/tour/install, shared primitives + motion CSS)
Primary workflow: Overview scan → Ledger CRUD → Recurring record → Savings → Categories/Accounts
State coverage: see matrix below (manual per-route) + reports/state-coverage.json (lexical)
Ran: code audit (3 surface passes); check_state_coverage.ts (191 files, passed)
Skipped: visual_smoke_test.mjs — localhost:3001 not reachable (fetch failed; curl HTTP 000);
         screenshots unsupported (script: skipped-no-browser-driver);
         prefers-reduced-transparency / prefers-contrast device passes
Manual: P0 browser checklist at end of this report
Files proposed: listed in Before/After tables (not edited this pass)
Verification required: unit/e2e when implementing P0–P2
Risks: month placeholderData trust; Accounts IA living on Categories; dead Recurring N shortcut
```

---

## Verdict

Motion and chrome are already strong: named route VTs (`page-forward` / `page-back`), Vaul `DrawerHandle`, chrome springs with `bounce: 0`, press `scale(0.97)`, modal-center vs menu trigger-origin, frosted nav + safe areas, global PRM kill-switch.

Gaps cluster in **trust / wayfinding**, **high-frequency motion**, **state parity across routes**, and **secondary-surface feature parity** — not a visual rebrand.

---

## Ran / Skipped / Manual / Planned

| Kind    | Item                                                                 | Result                                                                                                                           |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Ran     | Code audit (shell, Overview+Ledger, secondary)                       | Complete — findings below                                                                                                        |
| Ran     | `check_state_coverage.ts --root … --out reports/state-coverage.json` | Passed (191 files); all 8 state **markers** present. Lexical only — not proof of per-surface coverage                            |
| Skipped | `visual_smoke_test.mjs --url http://localhost:3001/`                 | Fetch failed (dev server not reachable). Evidence: `reports/visual-smoke/summary.json`. Screenshots: `skipped-no-browser-driver` |
| Skipped | Reduced-transparency / more-contrast OS prefs                        | Needs Manual device pass                                                                                                         |
| Manual  | P0 trust checks                                                      | Listed under “Manual browser checks (P0)”                                                                                        |
| Planned | Implementation waves P0 → P1 → P2                                    | Follow-up; not executed here                                                                                                     |

---

## State coverage matrix (manual)

Legend: **Y** = implemented · **P** = partial · **N** = missing / misleading · **—** = N/A at surface

| Surface                  | Loading | Empty | Error | Disabled | Focus | Selected | Submitting | Success | Evidence                                                               |
| ------------------------ | ------- | ----- | ----- | -------- | ----- | -------- | ---------- | ------- | ---------------------------------------------------------------------- |
| App gate                 | P       | —     | Y     | —        | P     | —        | —          | —       | Spinner only; Retry on error; skip/`#main` gap                         |
| Onboarding               | P       | —     | Y     | Y        | P     | Y        | Y          | —       | Suspense “Loading…”; tiles lack press/focus                            |
| Overview                 | Y       | Y     | P     | Y        | Y     | Y        | Y          | Y       | Header+skeleton; PageError drops chrome; accounts CTA                  |
| Ledger                   | Y       | Y     | P     | Y        | Y     | Y        | Y          | Y       | Empty vs filtered-empty; skeleton ≠ Card; AnimatedMoney                |
| Recurring                | Y       | Y     | Y     | Y        | Y     | Y        | Y          | Y       | N hotkey dead; mobile View payments missing; payments modal error weak |
| Savings                  | Y       | Y     | N     | P        | P     | —        | P          | P       | PageError no retry; no delete; silent validation; contribute dump      |
| Categories               | Y       | P     | Y     | Y        | Y     | Y        | Y          | Y       | Filter-empty says “No categories yet”                                  |
| Accounts (on Categories) | Y       | Y     | Y     | Y        | Y     | —        | Y          | Y       | Pattern matches Ledger; Overview “Manage” wayfinding                   |
| Composers / modals       | P       | —     | P     | Y        | Y     | —        | Y          | Y       | Budget load; Backup Save footer; savings form errors                   |
| Tour / install           | P       | —     | —     | —        | —     | —        | —          | —       | Overview-only tour; nudge without install prompt                       |

`reports/state-coverage.json` note: absence of a term is not proof a state is absent; presence is not proof every route handles it.

---

## Critical / High — Before / After / Why

| Before                                                                                                                                             | After                                                                  | Why                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Skip link always targets `#main` while gate can render without `#main` (`src/routes/__root.tsx`, `src/app/app-gate.tsx`)                           | Hide skip until `ready`, or always mount `#main` wrapping gate content | Broken bypass / WCAG skip target                      |
| Recurring header/empty advertise `N` (`src/routes/recurring.tsx`) but `useCreateHotkey` only on Overview/Ledger                                    | Wire `useCreateHotkey` on Recurring **or** remove `Kbd`                | Dead shortcut trains distrust                         |
| Mobile Recurring `RecurringActionsMenu` omits `onViewPayments` (`src/components/recurring/recurring-lists.tsx` ~205–213); desktop passes it (~308) | Pass the same handler on mobile                                        | PWA feature parity                                    |
| Savings: no delete UI despite `deleteSavingsGoal`; `PageError` with no `message`/`onRetry` (`src/routes/savings.tsx` ~103)                         | `ConfirmDeleteDialog` + retry like Recurring                           | Agency + state model                                  |
| Ledger (and Recurring stats) `AnimatedMoney` on filter/search/month-derived totals (`src/routes/ledger.tsx` ~193–204)                              | Static `money()` for derived/filter totals                             | High-frequency motion (emil: don’t animate tens+/day) |
| Month queries use `placeholderData: (prev) => prev` with no `isFetching` cue (`src/routes/index.tsx`, `src/lib/ledger-list.ts`)                    | MonthNav busy indicator and/or `aria-busy` on `.month-view`            | Stale numbers vs month label                          |
| Overview Accounts “Manage” → Categories without saying so (`src/components/overview/overview-accounts-panel.tsx`)                                  | Label “Open Categories” / “Accounts on Categories”                     | Wayfinding                                            |

---

## Medium — Before / After / Why

| Before                                                                                                                              | After                                                                     | Why                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| `PageError` is a bare centered block (`src/components/layout/page-query-state.tsx`)                                                 | Wrap in `PageShell` + page title (month nav optional/disabled)            | Orientation on failure             |
| Every `Card` uses `bg-card/90 backdrop-blur-sm` (`src/components/ui/card.tsx`)                                                      | Solid `bg-card` for data panels; reserve blur for nav/sheet chrome        | Materials hierarchy (apple)        |
| `hover-lift` on tabs, ghost links, list rows, and primary CTAs                                                                      | Lift only on primary CTAs; muted hover on secondary                       | Hierarchy (emil)                   |
| Ledger filter chips are display-only (`src/components/ledger/ledger-filters.tsx`)                                                   | Chip click clears that dimension                                          | Repeated filter action (webapp-ui) |
| Categories empty always “No categories yet” under Expense/Income tabs (`src/components/categories/category-lists.tsx`)              | Distinct filtered-empty copy                                              | State clarity                      |
| Savings silent validation; “Add progress” writes full remainder (`src/lib/savings-form.ts`)                                         | Inline errors; reuse `fund-goal-dialog` for amounts                       | Feedback / agency                  |
| Backup modal exposes disabled default “Save” (`src/components/backup-modal.tsx`)                                                    | Hide submit or label Export/Restore only; destructive styling for restore | Mapping                            |
| Sonner gets `theme="system"`; overlay CSS targets unused Radix toast (`src/components/ui/sonner.tsx`, `src/styles/55-overlays.css`) | Resolve to light/dark; Sonner-specific styles or delete dead rules        | Theme harmony                      |
| PRM overlays still seed `scale(0.92)` while transitions drop transform (`src/styles/55-overlays.css`, `70-reduced-motion.css`)      | Opacity-only under PRM (mirror `45-page-enter.css`)                       | Reduced motion                     |
| Composer inputs default `h-9`; Ledger filters use `min-h-11` on compact                                                             | `min-h-11 md:min-h-9` on drawer form controls                             | Touch targets                      |
| Overview section `Suspense` skeletons never run (no suspense queries)                                                               | Remove wrappers **or** adopt suspenseful section queries                  | Honest loading                     |
| `LedgerPageSkeleton` ≠ Card + summary strip layout                                                                                  | Mirror loaded chrome                                                      | Layout shift                       |

---

## Craft / Low — Before / After / Why

| Before                                                                    | After                                               | Why                       |
| ------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| Onboarding start-mode tiles lack `focus-visible` / press scale            | Match `Button` / `pressable`                        | Response parity           |
| Brand `Link` in nav lacks `focus-visible:ring`                            | Same ring as nav links                              | Keyboard wayfinding       |
| Dialog close uses `focus:ring`                                            | `focus-visible:ring`                                | Avoid mouse focus noise   |
| Savings cards show raw ISO `targetDate`                                   | `formatIsoDate` like Ledger/Recurring               | Scan consistency          |
| Categories empty has no icon; Savings CTA casing “Add goal” vs “Add Goal” | Icon + consistent casing                            | Empty-state polish        |
| Nav “Bills”/“Goals” vs page titles “Recurring”/“Savings goals”            | Align labels or teach in tour                       | Familiarity / terminology |
| Tour Overview-only; install nudge without `beforeinstallprompt`           | Gate nudge on capability; extend tour later         | Utility                   |
| Gate loading is spinner-only; modal open waits on `motion.openOverlay`    | Shell-shaped loading; open immediately + phase gate | Perceived latency         |
| Recurring payments modal: pending/empty only, no query error              | Error + retry                                       | Trust                     |
| Income/Expense Overview tiles link month-only Ledger                      | Deep-link type filter when search supports it       | Wayfinding                |

---

## What already works (keep)

- View-transition names via `html[data-vt-route]` / `data-vt-month` (`src/styles/50-view-transitions.css`); no `:active-view-transition-type` retargeting.
- Vaul bottom-sheet handle; CSS does not fight translate (`src/components/ui/drawer.tsx`, `55-overlays.css`).
- Chrome springs `bounce: 0`; interruptible `animateChrome`; nav pill PRM snap.
- `Button` / `pressable` / stat-tile `active:scale-[0.97]`; no shell `transition: all` / `ease-in` / enter `scale(0)`.
- Modal `transform-origin: center`; menus/select use Radix origin vars.
- Frosted top/bottom chrome + `--tab-bar-h` / safe-area tokens; Sonner `mobileOffset`.
- PRM global kill-switch last in cascade; page-enter opacity-only branch.
- Ledger empty vs filtered-empty; composers + `ConfirmDeleteDialog` on most CRUD surfaces; virtualized lists; FLIP gated off on compact virtualized paths.

---

## Recommended implementation waves (follow-up)

### P0 — Trust _(implemented 2026-11-03)_

1. Skip link / `#main` gate parity
2. Recurring `N` hotkey or remove `Kbd`
3. Mobile Recurring `onViewPayments`
4. Savings delete + `PageError` retry/message
5. Stop `AnimatedMoney` on derived Ledger/Recurring filter totals
6. Month `isFetching` cue on MonthNav / `.month-view`
7. Overview Accounts CTA copy → Categories

### P1 — Chrome / state _(implemented 2026-11-03)_

1. `PageError` inside `PageShell` + title
2. Solid cards vs blurred chrome
3. Restrict `hover-lift`
4. Tappable Ledger filter chips
5. Categories filtered-empty
6. Savings validation + fund dialog for contribute
7. Backup footer cleanup
8. Sonner theme + dead toast CSS
9. PRM opacity-only overlays
10. Composer touch targets
11. Overview Suspense cleanup
12. Ledger skeleton parity

### P2 — Craft _(implemented 2026-11-04)_

Focus rings, terminology/tour, install nudge gate, savings date format, payments modal error, deep-link stats → Ledger type, gate loading chrome, open-overlay latency.

---

## Manual browser checks (P0) — for later implementation wave

Do these on Chromium (desktop + ~390px) after P0 lands; PRM on/off.

1. **Skip link** — Tab once on gate loading, onboarding, and ready app; verify target exists and focuses main content.
2. **Recurring `N`** — On `/recurring`, press `N` with composer closed; expect create sheet (or no `Kbd` if removed).
3. **View payments (phone)** — Record a payment; open row menu on mobile width; “View payments” present and lists txs / shows error not false empty.
4. **Savings delete / error** — Delete a goal via confirm; force query failure and confirm Retry restores.
5. **Ledger totals** — Change type tab / search rapidly; summary numbers must not blur/scale-animate.
6. **Month nav stale** — Throttle Network; step months; busy cue appears; numbers don’t silently lie without indication.
7. **Accounts CTA** — From Overview Accounts, button label clearly indicates Categories destination; lands on accounts UI.

Optional after P1: card materials (no nested frosted stack), chip-clear filters, Backup without orphan “Save”, PRM modal enter (opacity only).

---

## Files proposed (implementation reference)

| Area             | Paths                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Shell / a11y     | `src/routes/__root.tsx`, `src/app/app-gate.tsx`, `src/app/app-nav.tsx`, `src/app/onboarding.tsx`                                   |
| Query chrome     | `src/components/layout/page-query-state.tsx`, `src/components/layout/month-nav.tsx`, `src/components/layout/page-skeletons.tsx`    |
| Overview         | `src/routes/index.tsx`, `src/components/overview/*`                                                                                |
| Ledger           | `src/routes/ledger.tsx`, `src/components/ledger/*`, `src/lib/ledger-list.ts`, `src/components/animated-number.tsx`                 |
| Recurring        | `src/routes/recurring.tsx`, `src/components/recurring/recurring-lists.tsx`, `src/hooks/use-create-hotkey.ts`                       |
| Savings          | `src/routes/savings.tsx`, `src/lib/savings-form.ts`, `src/components/savings-goal-card.tsx`, `src/components/fund-goal-dialog.tsx` |
| Categories       | `src/routes/categories.tsx`, `src/components/categories/category-lists.tsx`                                                        |
| Overlays / toast | `src/components/ui/card.tsx`, `sonner.tsx`, `dialog.tsx`, `responsive-modal.tsx`, `backup-modal.tsx`, `budget-modal.tsx`           |
| Motion CSS       | `src/styles/55-overlays.css`, `70-reduced-motion.css`, `45-page-enter.css`                                                         |

---

## Non-goals (this pass)

- No UI code changes
- No motion system refactors
- No IA move of Accounts off Categories
- No landing marketing redesign
- No Capacitor / iOS Safari runtime work
