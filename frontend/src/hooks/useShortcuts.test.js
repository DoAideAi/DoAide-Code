import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_KEYS, keyProblem, loadKeys, saveKeys, shortcutFor, shortcutLabel } from './useShortcuts.js'

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

describe('configurable keys', () => {
  beforeEach(() => localStorage.clear())

  it('uses the saved keys, and none for a shortcut turned off', () => {
    const keys = { ...DEFAULT_KEYS, newChat: 'j', stop: null }
    expect(shortcutFor(key('j', { ctrlKey: true }), keys)).toBe('newChat')
    expect(shortcutFor(key('k', { ctrlKey: true }), keys)).toBeNull()
    expect(shortcutFor(key('Escape'), keys)).toBeNull()
    expect(shortcutFor(key('l', { metaKey: true }), { ...keys, clear: null })).toBeNull()
  })

  it('saves and loads, falling back to the defaults on junk', () => {
    expect(loadKeys()).toEqual(DEFAULT_KEYS)
    saveKeys({ ...DEFAULT_KEYS, clear: 'u' })
    expect(loadKeys().clear).toBe('u')
    localStorage.setItem('doaide-shortcuts', '{oops')
    expect(loadKeys()).toEqual(DEFAULT_KEYS)
  })

  it('refuses keys the browser needs, duplicates, and non-letters', () => {
    expect(keyProblem(DEFAULT_KEYS, 'newChat', 'c')).toMatch(/belongs to the browser/)
    expect(keyProblem(DEFAULT_KEYS, 'newChat', 'l')).toBe('Already used by Clear view')
    expect(keyProblem(DEFAULT_KEYS, 'newChat', 'enter')).toBe('Use a letter or a digit')
    expect(keyProblem(DEFAULT_KEYS, 'newChat', 'j')).toBeNull()
  })

  it('labels shortcuts for hints', () => {
    expect(shortcutLabel(DEFAULT_KEYS, 'newChat')).toMatch(/K$/)
    expect(shortcutLabel(DEFAULT_KEYS, 'stop')).toBe('Esc')
    expect(shortcutLabel({ ...DEFAULT_KEYS, clear: null }, 'clear')).toBeNull()
  })
})
