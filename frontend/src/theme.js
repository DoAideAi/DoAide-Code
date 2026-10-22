// Dark or light: a saved choice wins, else the system setting. The choice lives in localStorage;
// the page reads it from <html data-theme> (index.css).
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

export function saveTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  return applyTheme(theme)
}

// Calls back when the system setting changes and no choice is saved; returns an unsubscribe.
export function followSystem(onChange) {
  const media = window.matchMedia?.(LIGHT)
  if (!media) return () => {}
  const listener = () => savedTheme() || onChange(applyTheme())
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
