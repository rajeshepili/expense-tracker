# Phone use (Android PWA)

Expense Tracker is a **local-only** web app. On Android, use **Chrome** and install it as a Progressive Web App (PWA). There is no Capacitor / Play Store build in this milestone.

## Supported now

| Surface                | Notes                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Android Chrome         | OPFS + SQLite WASM with COEP/COOP (same stack as desktop Chromium)                                                           |
| Install to Home Screen | Chrome → Install app / Add to Home Screen (`standalone` display)                                                             |
| HTTPS demo             | [expense-tracker-amber-two-58.vercel.app](https://expense-tracker-amber-two-58.vercel.app) (`vercel.json` isolation headers) |

## Not supported yet

- **iOS Safari** as a primary runtime — SQLite WASM + OPFS is unreliable enough that we treat iPhone as a later phase (likely Capacitor + native SQLite).
- **Play Store / App Store** packaging.
- **Cloud sync** between phone and desktop — each origin keeps its own OPFS database. Move data with **Export backup** / **Restore backup**.

## Install (Android Chrome)

1. Open the app URL in Chrome (not a private tab).
2. Menu → **Install app** or **Add to Home Screen**.
3. Open from the icon **while online once** so the service worker can precache JS/WASM chunks (needed for airplane mode on every tab, not only screens you visited).
4. Confirm the ledger still loads after a cold start, then optionally try airplane mode.
5. Optionally export a backup from Overview → Budget.

After an app update, open the PWA online once so the new service worker can replace the asset cache; then offline navigation works again.

## Storage size

The installed PWA should stay small (app shell + SQLite, typically tens of MB at most). If Android shows gigabytes for this origin:

1. Open Overview → Budget / backup panel and check the “This site uses …” line.
2. Clear site data for the origin (Chrome → Site settings) and restore from a `.sqlite3` backup.
3. Prefer a normal Chrome profile (not many abandoned preview deploy origins).

WAL checkpoints and orphaned export temps are cleaned on open. Offline shell/assets come from Serwist (`src/sw.ts` + `scripts/serwist-inject.mjs` after `vite build`).

## Layout: phone vs tablet vs desktop

Navigation splits at `md` (768px) via `useIsMobile` / Tailwind `md:`. Lists and composers stay compact until `lg` (1024px) via `useIsCompact`:

|            | Phone (`<768`)                                               | Tablet (`768–1023`) | Desktop (`≥1024`)      |
| ---------- | ------------------------------------------------------------ | ------------------- | ---------------------- |
| Navigation | Bottom tabs (Overview / Ledger / Bills / Goals / Categories) | Top bar             | Top bar                |
| Lists      | Card rows                                                    | Card rows           | Dense tables           |
| Forms      | Vaul drawer (sheet), sticky footer                           | Vaul drawer         | Centered dialog        |
| Overview   | Page scroll; month stats in a 2×2 grid                       | Same single column  | Multi-column dashboard |

Same local SQLite database either way. Composers use `ResponsiveModal` (Drawer below `lg`, Dialog from `lg` up). Drawers set `repositionInputs={false}` so the keyboard does not shove the sheet off-screen; Save/Cancel stay in a sticky footer.

The root viewport uses `viewport-fit=cover`. Safe-area insets feed `--safe-*` and `--tab-bar-h` in `src/styles/10-tokens.css` so content and the install nudge clear the home indicator and tab bar.

## Headers & OPFS

Phone and desktop both need cross-origin isolation. See [opfs-and-cross-origin-isolation.md](./opfs-and-cross-origin-isolation.md).

## Local phone testing (LAN)

Prefer [portless](https://portless.sh) LAN mode over raw `IP:port`:

```bash
portless proxy start --lan
pnpm dev:portless        # app → https://app.pocketbook.local (mDNS)
# on the phone (same Wi-Fi), open that .local URL in Chrome
```

See [deploy.md](./deploy.md) for the two-origin portless workflow. Still use a normal (non-private) Chrome tab so OPFS works.

## Later phases

1. Capacitor Android shell wrapping this web build (optional Play Store).
2. iOS with a native SQLite path.
