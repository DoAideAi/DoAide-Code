import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './pwa.js'

describe('registerServiceWorker', () => {
  it('registers sw.js after load in production', () => {
    const container = { register: vi.fn(async () => {}) }
    expect(registerServiceWorker({ enabled: true, container })).toBe(true)
    expect(container.register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    expect(container.register).toHaveBeenCalledWith('/sw.js')
  })

  it('does nothing in dev or without support', () => {
    const container = { register: vi.fn() }
    expect(registerServiceWorker({ enabled: false, container })).toBe(false)
    expect(registerServiceWorker({ enabled: true, container: undefined })).toBe(false)
    window.dispatchEvent(new Event('load'))
    expect(container.register).not.toHaveBeenCalled()
  })
})

describe('PWA files', () => {
  const read = (name) => readFileSync(`public/${name}`, 'utf8')

  it('ships a complete manifest', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    expect(manifest.name).toBe('DoAide Code')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose ?? 'any'}`)
    expect(sizes).toEqual(['192x192:any', '512x512:any', '512x512:maskable'])
  })

  it('keeps the worker away from the API and sockets, with an offline fallback', () => {
    const sw = read('sw.js')
    expect(sw).toContain("url.pathname.startsWith('/api/')")
    expect(sw).toContain("'/ws', '/sync', '/agent'")
    expect(sw).toContain("caches.match(OFFLINE)")
    expect(read('offline.html')).toContain("You're offline")
  })
})
