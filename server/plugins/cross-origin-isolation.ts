import { definePlugin } from 'nitro'

/**
 * OPFS-backed SQLite needs cross-origin isolation (SharedArrayBuffer).
 * Stamp COEP/COOP/CORP on every response — including /assets workers + WASM —
 * via the response hook so Nitro’s asset cache headers can’t wipe them.
 *
 * Marketing builds must NOT set these — they break third-party embeds and are
 * unused (no OPFS on the marketing host). Gated by VITE_SITE_MODE.
 */
const isMarketing =
  (process.env.VITE_SITE_MODE ?? process.env.SITE_MODE) === 'marketing'

export default definePlugin((nitroApp) => {
  if (isMarketing) return

  nitroApp.hooks.hook('response', (res) => {
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  })
})
