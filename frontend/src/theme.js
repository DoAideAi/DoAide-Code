// Dark or light: a saved choice wins, else the system setting. The choice lives in localStorage;
// the page reads it from <html data-theme> (index.css). Choosing 'system' forgets the saved one.
const KEY = 'doaide-theme'
const LIGHT = '(prefers-color-scheme: light)'
const BACKGROUND = { dark: '#0f1013', light: '#ffffff' }

export function savedTheme() {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function systemTheme() {
  return window.matchMedia?.(LIGHT).matches ? 'light' : 'dark'
}

export function currentTheme() {
  return savedTheme() ?? systemTheme()
}

export function applyTheme(theme = currentTheme()) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUND[theme])
  return theme
}

// 'light', 'dark' or 'system' (no saved choice): what the settings page shows as selected.
export function themeChoice() {
  return savedTheme() ?? 'system'
}

const CHANGED = 'doaide-theme-change'

// Saves 'light', 'dark' or 'system'; returns the theme now shown. Every control showing the theme
// (the header toggle, the settings page) hears about it through onThemeChange.
export function saveTheme(choice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  const theme = applyTheme(choice === 'system' ? systemTheme() : choice)
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: theme }))
  return theme
}

// Calls back with the theme shown after any saveTheme; returns an unsubscribe.
export function onThemeChange(callback) {
  const listener = (e) => callback(e.detail)
  window.addEventListener(CHANGED, listener)
  return () => window.removeEventListener(CHANGED, listener)
}

// Calls back when the system setting changes and no choice is saved; returns an unsubscribe.
export function followSystem(onChange) {
  const media = window.matchMedia?.(LIGHT)
  if (!media) return () => {}
  const listener = () => savedTheme() || onChange(applyTheme())
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
