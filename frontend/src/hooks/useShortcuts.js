import { useEffect, useRef } from 'react'

// Ctrl on Windows and Linux, Cmd on a Mac: what the shortcut hints show.
export const MOD_KEY = /mac/i.test(globalThis.navigator?.platform ?? '') ? '⌘' : 'Ctrl+'

// The action a key press asks for, or null:
//   Ctrl/Cmd+K  new chat
//   Ctrl/Cmd+L  clear the chat from view (the conversation goes on)
//   Escape      stop the reply being written
export function shortcutFor(event) {
  if (event.isComposing || event.defaultPrevented) return null
  const mod = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
  const key = event.key?.toLowerCase()
  if (mod && key === 'k') return 'newChat'
  if (mod && key === 'l') return 'clear'
  if (key === 'escape' && !event.ctrlKey && !event.metaKey && !event.altKey) return 'stop'
  return null
}

// Runs `actions[name]` for each shortcut; an action returning false lets the browser have the key.
export default function useShortcuts(actions) {
  const latest = useRef(actions)
  latest.current = actions
  useEffect(() => {
    const onKey = (event) => {
      const name = shortcutFor(event)
      const action = name && latest.current[name]
      if (action && action() !== false) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
