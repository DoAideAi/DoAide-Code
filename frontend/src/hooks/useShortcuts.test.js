import { describe, expect, it } from 'vitest'
import { shortcutFor } from './useShortcuts.js'

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods })

describe('shortcutFor', () => {
  it('Ctrl or Cmd with K starts a new chat, with L clears the view', () => {
    expect(shortcutFor(key('k', { ctrlKey: true }))).toBe('newChat')
    expect(shortcutFor(key('K', { metaKey: true }))).toBe('newChat')
    expect(shortcutFor(key('l', { ctrlKey: true }))).toBe('clear')
    expect(shortcutFor(key('l', { metaKey: true }))).toBe('clear')
  })

  it('Escape stops the reply', () => {
    expect(shortcutFor(key('Escape'))).toBe('stop')
  })

  it('ignores plain letters, other modifiers, IME composition and handled keys', () => {
    expect(shortcutFor(key('k'))).toBeNull()
    expect(shortcutFor(key('k', { ctrlKey: true, shiftKey: true }))).toBeNull()
    expect(shortcutFor(key('l', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(shortcutFor(key('Escape', { ctrlKey: true }))).toBeNull()
    expect(shortcutFor({ ...key('k', { ctrlKey: true }), isComposing: true })).toBeNull()
    // The message box already used Escape (to clear what was typed).
    expect(shortcutFor({ ...key('Escape'), defaultPrevented: true })).toBeNull()
  })
})
