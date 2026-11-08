/**
 * Service Worker for Pocketbook PWA
 *
 * Precaches the shell + hashed build assets (injected at build time).
 * Runtime caching is restricted to immutable static paths only — never
 * cache arbitrary same-origin GETs (that unbounded growth can fill disk).
 *
 * The Vite plugin `injectSwPrecache` (Nitro `compiled` hook) rewrites
 * SW_VERSION and PRECACHE into Nitro's final publicDir after each build.
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

function isCacheableAsset(url) {
  const p = url.pathname
  if (p.startsWith('/assets/')) return true
  if (p === '/manifest.webmanifest') return true
  if (p === '/_shell.html') return true
  if (p.startsWith('/icons/')) return true
  return false
}

/** Cache key ignores deploy query strings (?dpl=…) so one entry per path. */
function cacheKey(request) {
  const url = new URL(request.url)
  return url.origin + url.pathname
}

async function precacheAll(cache, urls) {
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => precacheAll(cache, PRECACHE)),
  )
  self.skipWaiting()
})

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

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: network-first; keep one shell copy for offline boot.
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
            .match('/')
            .then((cached) => cached || caches.match('/_shell.html')),
        ),
    )
    return
  }

  // Only immutable static assets — never cache API-ish or unknown GETs.
  if (!isCacheableAsset(url)) return

  const key = cacheKey(request)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(key)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(key, response.clone())
      return response
    }),
  )
})
