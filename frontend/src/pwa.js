// Registers the service worker (sw.js: offline page plus cached hashed assets). Production
// only: in dev a worker would cache stale modules and confuse everyone.

export function registerServiceWorker({ enabled = import.meta.env.PROD, container = navigator.serviceWorker } = {}) {
  if (!enabled || !container) return false
  // After load, so the first paint never competes with the registration.
  window.addEventListener('load', () => container.register('/sw.js').catch(() => {}), { once: true })
  return true
}
