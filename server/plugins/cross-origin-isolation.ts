import { definePlugin } from 'nitro'

/**
 * OPFS-backed SQLite needs cross-origin isolation (SharedArrayBuffer).
 * Stamp COEP/COOP/CORP on every response — including /assets workers + WASM —
 * via the response hook so Nitro’s asset cache headers can’t wipe them.
 */
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('response', (res) => {
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  })
})
