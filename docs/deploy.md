# Deploying Pocketbook (two Vercel projects, one repo)

The repo deploys to **two** Hobby-tier Vercel projects under `linux-res-projects`:

| Project               | Hostname                                  | Config file             | Serves                                            |
| --------------------- | ----------------------------------------- | ----------------------- | ------------------------------------------------- |
| `expense-tracker-mkt` | `expense-tracker-mkt.vercel.app`          | `vercel.marketing.json` | Landing host: `/` (home); `/features`+`/privacy` redirect home |
| `expense-tracker`     | `expense-tracker-amber-two-58.vercel.app` | `vercel.app.json`       | The app: all routes, gate, OPFS database          |

Both projects import the same GitHub repo. In each project's Vercel settings, set:

- **Settings → General → "Vercel Configuration File"** to the matching file above.
- **Environment Variables**: `VITE_SITE_MODE=marketing` (`expense-tracker-mkt`) or `VITE_SITE_MODE=app` (`expense-tracker`). Optional overrides per preview: `VITE_APP_URL`, `VITE_MARKETING_URL` (e.g. point a marketing preview at the matching app preview).
- Production branch: `main`. Every other branch gets automatic preview deployments with the same headers.

The build-time split is a **dual route tree**:

| Mode        | Routes dir              | Generated tree                   | Contains                                                                 |
| ----------- | ----------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `app`       | `src/routes/app/`       | `src/routeTree.app.gen.ts`       | Overview, ledger, bills, goals, categories, year + AppGate/DB            |
| `marketing` | `src/routes/marketing/` | `src/routeTree.marketing.gen.ts` | Landing home (+ stub redirects) — **no** product routes, AppGate, or SQLite |

`VITE_SITE_MODE` selects the tree via Vite alias + `tanstackStart({ router: … })`. Run `pnpm generate-routes` after adding/renaming routes (writes both trees). After a marketing build, `pnpm assert:mkt-bundle` fails if product/SQLite markers leak into `.output`.

Wrong-host routes:

1. **Edge (production):** `redirects` in `vercel.app.json` / `vercel.marketing.json` return **307** before the SPA boots.
2. **Client fallback (app only):** `AppGate` redirects after mount on known split hosts. Plain `localhost` does **not** redirect.

### First-run (marketing → app)

- Marketing **Get started** (topbar + hero) links to `APP_URL/?from=mkt` (see `APP_SETUP_URL` in `src/lib/brand.ts`).
- Returning users: hero text **Already using Pocketbook? Open app** and footer **Open app** → bare `APP_URL`.
- App onboarding is a compact wizard only — **no** landing hero/product mock.
- Wizard: Welcome → Currency & budget → First account → **Categories** (multi-select expense tags; Income always seeded; “Select common” for Food/Housing/Transport/Other). `?from=mkt` (or a marketing referrer) **skips Welcome**; cold app visits still see Welcome + restore.
- Restore a `.sqlite3` backup is available from Welcome / Money; it replaces OPFS data and reloads.
- After setup, more income tags (Salary, Freelance, …) are added on Categories — not as extra accounts. Transfer appears in the ledger only once you have 2+ accounts.
- Marketing HTML `preconnect`s to `APP_URL`. Legacy `/features` and `/privacy` redirect to `/`.

OPFS is per-origin, so only the app host has a database; the marketing host never initializes one.

### CSP

- **Marketing:** `script-src 'self' 'unsafe-inline'` (TanStack hydration; no WASM).
- **App:** also `'wasm-unsafe-eval'` + `worker-src 'self'` for sqlocal.

## Local two-origin (portless)

[portless](https://portless.sh) gives named `.localhost` HTTPS URLs so local OPFS and cross-host redirects match production.

```bash
# Terminal A — app (OPFS origin)
pnpm dev:portless
# → https://app.pocketbook.localhost

# Terminal B — marketing
pnpm dev:portless:mkt
# → https://pocketbook.localhost
```

Or without portless (single origin, all routes on one host):

```bash
pnpm dev   # http://localhost:3000 — SITE_MODE=app, no cross-host bounce
```

Mode-specific Vite without the proxy:

```bash
pnpm dev:app   # VITE_SITE_MODE=app
pnpm dev:mkt   # VITE_SITE_MODE=marketing
```

First HTTPS run: `portless trust` (local CA). Diagnose with `portless doctor` / `portless list`.

## Host / mode drift

If `VITE_SITE_MODE` does not match the host, `AppGate` shows a **blocking error** (“Wrong host for this build”) instead of silently serving the wrong personality. Fix the Vercel project env var and redeploy.

## Preview caveat

Edge `redirects` in the vercel JSON files hardcode production hosts. Preview deployments still get correct headers and `data-site-mode`, but wrong-host edge destinations may point at production — set `VITE_APP_URL` / `VITE_MARKETING_URL` on each preview pair so the **client** gate lands on the matching preview. `node scripts/verify-deploy.mjs <mkt> <app>` soft-checks edge Location when URLs are not the production defaults.

## Security headers

- **App** (`vercel.app.json`): COEP `require-corp` + COOP `same-origin` + CORP `same-origin` (required for OPFS/shared memory), HSTS, self-only CSP (`worker-src 'self'`), nosniff, `X-Frame-Options: DENY`, strict referrer policy, restrictive permissions policy (camera/mic/geo/payment/usb off). Notification permission is requested via the Notification API, not Permissions-Policy — Chromium does not recognize a `notifications` feature token. `sw.js` is `no-cache` + `Service-Worker-Allowed: /`.
- **Marketing** (`vercel.marketing.json`): same minus COEP/COOP/CORP (no OPFS there).
- App builds run `scripts/serwist-inject.mjs` after Vite so `sw.js` embeds a fresh precache of hashed assets (and the SPA shell URLs). A stub `public/sw.js` exists so Nitro registers `/sw.js` during Vite; inject overwrites it and syncs Nitro’s baked size/etag (otherwise preview truncates the SW). Marketing `build:mkt` deletes `sw.js` from output.

## Verify a deploy

```bash
node scripts/verify-deploy.mjs                 # production hosts
node scripts/verify-deploy.mjs <mkt-url> <app-url>   # preview URLs
```

Checks: 200s, marketing has **no** COEP, app **has** COEP, both have HSTS/CSP/nosniff, `data-site-mode` on HTML, `/features`+`/privacy` resolve on marketing (redirect home), `/ledger` on marketing and `/features` on app return edge redirects to the sibling host.

## Runbook when a deploy looks wrong

1. Open the deployment in the Vercel dashboard → **Build Logs**; most failures are a broken dual-mode build — reproduce locally with `VITE_SITE_MODE=app pnpm build` and `VITE_SITE_MODE=marketing pnpm build` (CI runs both on every PR).
2. Run `node scripts/verify-deploy.mjs` against the deployment URL — header drift shows up here first.
3. If headers are wrong, check which config file the project is using (Settings → General).
4. If the gate shows “Wrong host for this build”, the project’s `VITE_SITE_MODE` does not match the hostname — fix env and redeploy.
5. Rollback is instant: Vercel dashboard → Deployments → Promote an older one. No database migration involved — all data is client-side.
6. If the app gate shows an OPFS error on a real device: private window or unsupported browser. The gate copy names Chrome/Edge; no server-side fix exists by design.
