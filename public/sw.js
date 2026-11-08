/**
 * Service Worker for Pocketbook PWA
 * Offline support: precaches the shell + build assets, runtime-caches
 * same-origin GETs, and falls back to the cached shell for navigations.
 *
 * `scripts/inject-sw-precache.mjs` rewrites SW_VERSION and PRECACHE after
 * production builds so every hashed chunk/wasm is available offline.
 */

// SW_VERSION_START
const SW_VERSION = 'dev'
// SW_VERSION_END
const CACHE_NAME = `expense-tracker-${SW_VERSION}`
// PRECACHE_START
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
]
// PRECACHE_END

async function precacheAll(cache, urls) {
  // Prefer per-URL put over addAll so one miss does not abort the install.
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' })
        if (response.ok) await cache.put(url, response)
        else console.warn('[sw] precache skip', url, response.status)
      } catch (err) {
        console.warn('[sw] precache fail', url, err)
      }
    }),
  )
}

// Install: cache the shell + every hashed asset, then activate immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => precacheAll(cache, PRECACHE)),
  )
  self.skipWaiting()
})

// Activate: drop old caches and take control of open clients.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Notifications: tapping a bill reminder opens (or focuses) the app on Bills.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate('/recurring')
            return client.focus()
          }
        }
        return clients.openWindow('/recurring')
      }),
  )
})

// Fetch handling. Only same-origin GETs; everything else goes to the network.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: network-first, keep the cached shell fresh while online,
  // fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached || caches.match('/') || caches.match('/_shell.html'),
            ),
        ),
    )
    return
  }

  // Static assets (JS/CSS/fonts/wasm/icons): cache-first, populate cache from
  // network on miss so the next offline load works.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
