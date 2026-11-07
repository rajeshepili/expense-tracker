/**
 * Service Worker for Pocketbook PWA
 * Offline support: precaches the shell, runtime-caches same-origin assets,
 * and falls back to the cached shell for navigations while offline.
 */

// Bump per release so deploys cleanly replace old caches.
const SW_VERSION = '2026-11-07.1'
const CACHE_NAME = `expense-tracker-${SW_VERSION}`
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png',
]

// Install: cache the shell, then activate immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
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
          caches.match(request).then(
            (cached) => cached || caches.match('/'),
          ),
        ),
    )
    return
  }

  // Static assets (JS/CSS/fonts/icons): cache-first, populate cache from
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
