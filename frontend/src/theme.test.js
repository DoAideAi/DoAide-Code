import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, currentTheme, followSystem, onThemeChange, saveTheme, savedTheme, themeChoice } from './theme.js'

// A fake prefers-color-scheme query whose answer the test can flip.
function mockSystem(light) {
  const listeners = new Set()
  const media = {
    get matches() {
      return light
    },
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    set(value) {
      light = value
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterEach(() => vi.unstubAllGlobals())

describe('theme', () => {
  it('follows the system setting until a choice is saved', () => {
    mockSystem(true)
    expect(savedTheme()).toBeNull()
    expect(currentTheme()).toBe('light')
    expect(applyTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('defaults to dark when the browser has no preference query', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(currentTheme()).toBe('dark')
  })

  it('a saved choice wins over the system and is kept in localStorage', () => {
    mockSystem(true)
    expect(saveTheme('dark')).toBe('dark')
    expect(localStorage.getItem('doaide-theme')).toBe('dark')
    expect(currentTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('ignores junk in localStorage', () => {
    mockSystem(false)
    localStorage.setItem('doaide-theme', 'purple')
    expect(savedTheme()).toBeNull()
    expect(currentTheme()).toBe('dark')
  })

  it('updates the browser theme color', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0f1013">'
    applyTheme('light')
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#ffffff')
  })

  it('reacts to system changes only while nothing is saved', () => {
    const system = mockSystem(false)
    const seen = []
    const stop = followSystem((t) => seen.push(t))
    system.set(true)
    expect(seen).toEqual(['light'])
    saveTheme('dark')
    system.set(false)
    system.set(true)
    expect(seen).toEqual(['light'])
    stop()
    expect(system.listeners.size).toBe(0)
  })

  it("'system' forgets the saved choice and shows the system's theme", () => {
    mockSystem(true)
    saveTheme('dark')
    expect(themeChoice()).toBe('dark')
    expect(saveTheme('system')).toBe('light')
    expect(localStorage.getItem('doaide-theme')).toBeNull()
    expect(themeChoice()).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('tells every listener what is shown after a save', () => {
    mockSystem(false)
    const seen = []
    const stop = onThemeChange((t) => seen.push(t))
    saveTheme('light')
    saveTheme('system')
    stop()
    saveTheme('light')
    expect(seen).toEqual(['light', 'dark'])
  })
})
