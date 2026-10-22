import { useEffect, useRef } from 'react'

// Ctrl on Windows and Linux, Cmd on a Mac: what the shortcut hints show.
export const MOD_KEY = /mac/i.test(globalThis.navigator?.platform ?? '') ? '⌘' : 'Ctrl+'

// Each action's key, changeable on the settings page: a letter or digit pressed with Ctrl/Cmd, or
// null when the shortcut is off. Stop is Escape alone, on or off.
//   newChat  Ctrl/Cmd+K  new chat
//   clear    Ctrl/Cmd+L  clear the chat from view (the conversation goes on)
//   stop     Escape      stop the reply being written
export const DEFAULT_KEYS = { newChat: 'k', clear: 'l', stop: 'escape' }
const KEY = 'doaide-shortcuts'
// Keys the browser or the message box needs with Ctrl/Cmd: copy, paste, undo, close tab, ...
export const RESERVED = new Set(['a', 'c', 'f', 'n', 'q', 'r', 't', 'v', 'w', 'x', 'y', 'z'])

export function loadKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return { ...DEFAULT_KEYS, ...(saved && typeof saved === 'object' ? saved : {}) }
  } catch {
    return { ...DEFAULT_KEYS }
  }
}

export function saveKeys(keys) {
  try {
    localStorage.setItem(KEY, JSON.stringify(keys))
  } catch {
    // Storage unavailable (private mode): the defaults stay.
  }
  return keys
}

// Why `key` cannot be `action`'s shortcut, or null when it can.
export function keyProblem(keys, action, key) {
  if (!/^[a-z0-9]$/.test(key)) return 'Use a letter or a digit'
  if (RESERVED.has(key)) return `${MOD_KEY}${key.toUpperCase()} belongs to the browser`
  const other = Object.keys(keys).find((name) => name !== action && keys[name] === key)
  return other ? `Already used by ${other === 'newChat' ? 'New chat' : 'Clear view'}` : null
}

// How a shortcut reads in hints, e.g. "⌘K"; null when it is off.
export function shortcutLabel(keys, action) {
  const key = keys[action]
  if (!key) return null
  return key === 'escape' ? 'Esc' : `${MOD_KEY}${key.toUpperCase()}`
}

// The action a key press asks for, or null.
export function shortcutFor(event, keys = DEFAULT_KEYS) {
  if (event.isComposing || event.defaultPrevented) return null
  const mod = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
  const key = event.key?.toLowerCase()
  if (mod && key && keys.newChat === key) return 'newChat'
  if (mod && key && keys.clear === key) return 'clear'
  if (keys.stop && key === 'escape' && !event.ctrlKey && !event.metaKey && !event.altKey) return 'stop'
  return null
}

// Runs `actions[name]` for each shortcut; an action returning false lets the browser have the key.
// The keys are read at each press, so changes on the settings page apply at once.
export default function useShortcuts(actions) {
  const latest = useRef(actions)
  latest.current = actions
  useEffect(() => {
    const onKey = (event) => {
      const name = shortcutFor(event, loadKeys())
      const action = name && latest.current[name]
      if (action && action() !== false) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
