// Node 26 ships its own (flag-gated, here undefined) localStorage that shadows jsdom's.
class MemoryStorage {
  constructor() {
    this.items = new Map()
  }
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null
  }
  setItem(key, value) {
    this.items.set(key, String(value))
  }
  removeItem(key) {
    this.items.delete(key)
  }
  clear() {
    this.items.clear()
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
