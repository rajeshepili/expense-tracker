/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { ExpirationPlugin, NetworkFirst, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Precache manifest is written by scripts/serwist-inject.mjs after vite build.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  cacheId: 'pocketbook',
  runtimeCaching: [
    {
      matcher({ request, sameOrigin }) {
        return (
          sameOrigin &&
          request.destination === 'document' &&
          request.mode === 'navigate'
        )
      },
      handler: new NetworkFirst({
        cacheName: 'pocketbook-pages',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/_shell.html',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.navigate('/recurring')
          await client.focus()
          return
        }
      }
      await self.clients.openWindow('/recurring')
    })(),
  )
})
