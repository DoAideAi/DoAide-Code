// Service worker: hashed assets are served cache-first (their names change on every deploy),
// pages go to the network with /offline.html as the fallback, and the API, sockets and other
// origins are never touched. Bump VERSION to drop every old cache on activate.
const VERSION = 'doaide-code-v1'
const OFFLINE = '/offline.html'
const PRECACHE = [OFFLINE, '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/') || ['/ws', '/sync', '/agent'].includes(url.pathname)) return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)))
    return
  }
  if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(event.request)
        if (hit) return hit
        const resp = await fetch(event.request)
        if (resp.ok) cache.put(event.request, resp.clone())
        return resp
      }),
    )
  }
})
