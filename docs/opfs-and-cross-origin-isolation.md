# OPFS persistence & cross-origin isolation

This app stores its SQLite database in the browser via [SQLocal](https://sqlocal.dev) and the **Origin Private File System (OPFS)**. That only works when the page is **cross-origin isolated**. If the isolation headers are missing on the HTML **or** on worker/WASM assets, the database never opens and the UI can sit on “Loading…” forever.

## What is OPFS?

OPFS is a private file store the browser gives **this origin only**:

- Data survives normal reloads (unlike a pure in-memory SQLite DB).
- It is not a normal download folder; users clear it via site data / storage settings.
- **Incognito / private windows** typically do not keep OPFS across sessions — data can disappear when the window closes.
- Safari and Firefox support for the SQLite-WASM + OPFS path is limited; prefer a **Chromium** browser (Chrome, Edge, Brave, etc.).

SQLocal runs SQLite compiled to WebAssembly in a **web worker**, then persists the `.sqlite3` file into OPFS.

## Why COEP / COOP?

OPFS + SQLite WASM needs `SharedArrayBuffer`. Browsers only expose that when the document is cross-origin isolated, which requires these response headers:

| Header | Typical value |
| --- | --- |
| `Cross-Origin-Embedder-Policy` (COEP) | `require-corp` |
| `Cross-Origin-Opener-Policy` (COOP) | `same-origin` |
| `Cross-Origin-Resource-Policy` (CORP) | `same-origin` (safe for same-origin assets) |

The HTML document alone is not enough. Under COEP, **embedded workers and WASM** must also be allowed — in practice that means the same isolation headers on `/assets/*` (worker JS, `sqlite3.wasm`, etc.).

You can confirm isolation in DevTools:

```js
window.crossOriginIsolated // should be true
typeof SharedArrayBuffer !== 'undefined' // should be true
```

## How this repo sets the headers

| Mode | Mechanism |
| --- | --- |
| `pnpm dev` | [`sqlocal()` Vite plugin](https://sqlocal.dev/guide/setup) adds COEP/COOP on the dev server |
| `pnpm build` + `pnpm preview` / production | Nitro plugin [`server/plugins/cross-origin-isolation.ts`](../server/plugins/cross-origin-isolation.ts) stamps COEP/COOP/CORP on **every** response (HTML, JS, workers, WASM) via Nitro’s `response` hook |

`pnpm preview` runs the Nitro Node server (`node .output/server/index.mjs`), not Vite’s static preview. That matters: Vite preview can serve `/assets/*` **without** Nitro’s headers, which reproduces the worker-blocked failure below.

`vite.config.ts` enables scanning with `serverDir: './server'` so the plugin is picked up.

## Failure mode we hit (and how to recognize it)

**Symptom:** After `pnpm build && pnpm preview`, a cold load stays on “Loading…” for a long time (or forever). Chrome may report a COEP warning about `worker-*.js`.

**Cause:** The HTML response had COEP, but the SQLite worker (and/or WASM) did not. Chrome blocked the worker → SQLocal never connected → `AppGate` never left the loading state.

**Checks:**

```bash
# HTML — must include COEP/COOP
curl -sI http://127.0.0.1:3000/ | grep -i cross-origin

# Worker — must include COEP/COOP as well (pick the hashed name from Network tab)
curl -sI http://127.0.0.1:3000/assets/worker-XXXX.js | grep -i cross-origin
```

If HTML has the headers and the worker does not, isolation is broken for SQLite.

## Deploying elsewhere

Any host in front of this app must send the same headers on **all** responses that the page loads, especially:

- the document
- `/assets/worker-*.js` (and related SQLite worker scripts)
- `/assets/sqlite3-*.wasm`

Examples: CDN / reverse proxy config, static hosts that allow custom headers, or keep serving via the Nitro Node build so the plugin applies.

If you strip headers on a CDN cache layer for “immutable” assets only, you will reintroduce this bug.

## What the app does for users

- **Callouts** (`LocalDataCallout`) on onboarding and Overview: Chromium preferred, avoid private mode, clearing site data can erase the ledger.
- **Export / restore** (`BackupPanel` in Overview → Budget): download a `.sqlite3` file, or restore one (replaces all local data and reloads).
- **Backup reminder** if no export in ~14 days (snooze for 7 days).

Code: `src/components/local-data.tsx`, `src/data/backup.ts`, `src/lib/backup.ts`. No automatic browser/OPFS detection — copy + backups only.

## Troubleshooting

| Issue | Likely cause |
| --- | --- |
| Stuck on “Loading…” after preview/deploy | Worker/WASM missing COEP; check `curl -sI` on those assets |
| Could not open the local database | Wrong browser, private mode, or missing COOP/COEP — see callouts and headers section |
| Data gone after closing the browser | Incognito, or site data cleared — restore from an exported backup |
| Works in Chrome, not elsewhere | OPFS / SQLite WASM support — use Chromium |
| `crossOriginIsolated === false` | COOP/COEP not applied to the document |
| Dev works, production doesn’t | Production proxy/CDN not forwarding headers; don’t use bare `vite preview` for a realistic check |

## Further reading

- [SQLocal setup — cross-origin isolation](https://sqlocal.dev/guide/setup#cross-origin-isolation)
- [SQLite Wasm persistence (COOP/COEP)](https://sqlite.org/wasm/doc/trunk/persistence.md#coop-coep)
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)
