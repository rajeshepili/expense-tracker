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
3. Open from the icon; confirm the ledger still loads after a cold start.
4. Optionally export a backup from Overview → Budget.

## Layout: phone vs desktop

The UI splits at the `md` (768px) breakpoint:

|            | Phone                                          | Desktop                |
| ---------- | ---------------------------------------------- | ---------------------- |
| Navigation | Bottom tabs (Overview / Ledger / Bills / Categories) | Top bar                |
| Lists      | Card rows (no horizontal table pan)            | Dense tables           |
| Forms      | Vaul drawer (sheet)                            | Centered dialog        |
| Lists      | shadcn Item rows                               | Dense tables           |
| Overview   | Page scroll, collapsible callout               | Multi-column dashboard |

Same local SQLite database either way. Composers use `ResponsiveModal` (Drawer below `md`, Dialog from `md` up).

## Headers & OPFS

Phone and desktop both need cross-origin isolation. See [opfs-and-cross-origin-isolation.md](./opfs-and-cross-origin-isolation.md).

## Later phases

1. Capacitor Android shell wrapping this web build (optional Play Store).
2. iOS with a native SQLite path.
