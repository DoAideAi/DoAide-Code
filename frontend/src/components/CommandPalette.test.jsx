import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_KEYS, shortcutFor } from '../hooks/useShortcuts.js'
import { paletteItems } from '../palette.js'
import CommandPalette, { filterItems, score } from './CommandPalette.jsx'

afterEach(cleanup)

const act = (over = {}) => ({
  newChat: vi.fn(),
  search: vi.fn(),
  clear: vi.fn(),
  sidebar: vi.fn(),
  exportChat: null,
  settings: vi.fn(),
  models: vi.fn(),
  usage: vi.fn(),
  how: vi.fn(),
  toggleMute: vi.fn(),
  setTheme: vi.fn(),
  chooseModel: vi.fn(),
  switchProject: vi.fn(),
  openSession: vi.fn(),
  send: vi.fn(),
  ...over,
})

describe('matching', () => {
  it('ranks prefixes, then word starts, then inside, then letters in order', () => {
    expect(score('New chat', 'new')).toBe(1)
    expect(score('Search all conversations', 'conv')).toBe(2)
    expect(score('Settings', 'ting')).toBe(3)
    expect(score('New chat', 'nct')).toBe(4)
    expect(score('New chat', 'xyz')).toBeNull()
    const items = [{ label: 'Settings' }, { label: 'Theme: Dark' }, { label: 'Search all conversations' }]
    expect(filterItems(items, 'se').map((i) => i.label)).toEqual(['Settings', 'Search all conversations'])
  })
})

describe('paletteItems', () => {
  it('lists actions, models, projects, conversations and commands, leaving out what cannot run', () => {
    const models = { pinned: 'ollama', executors: [{ name: 'ollama', usable: true }, { name: 'claude-sonnet', usable: true }, { name: 'claude-opus', usable: false }] }
    const items = paletteItems({
      keys: DEFAULT_KEYS,
      models,
      projects: ['shop', 'blog'],
      project: 'shop',
      sessions: [{ id: 's', title: 'Here' }, { id: 't', title: 'Login bug' }],
      sessionId: 's',
      act: act(),
    })
    const ids = items.map((i) => i.id)
    expect(ids).toContain('new-chat')
    expect(ids).not.toContain('export')
    // Not the current choices, not models that cannot run.
    expect(ids.filter((id) => id.startsWith('model-'))).toEqual(['model-auto', 'model-claude-sonnet'])
    expect(ids.filter((id) => id.startsWith('project-'))).toEqual(['project-blog'])
    expect(ids.filter((id) => id.startsWith('session-'))).toEqual(['session-t'])
    expect(items.find((i) => i.id === 'new-chat').hint).toMatch(/K$/)
  })

  it('offline: no model, project or command items', () => {
    const items = paletteItems({ keys: DEFAULT_KEYS, act: act({ chooseModel: null, switchProject: null, send: null }) })
    expect(items.some((i) => /^(model|project|cmd)-/.test(i.id))).toBe(false)
  })
})

describe('CommandPalette', () => {
  const items = [
    { id: 'a', label: 'New chat', group: 'Actions', run: vi.fn() },
    { id: 'b', label: 'Settings', group: 'Actions', run: vi.fn() },
    { id: 'c', label: 'Switch to project: blog', group: 'Project', run: vi.fn() },
  ]

  it('filters as you type and runs the highlighted item with Enter', () => {
    const onClose = vi.fn()
    render(<CommandPalette items={items} onClose={onClose} />)
    const input = screen.getByTestId('palette-input')
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: 'blog' } })
    expect(screen.queryByTestId('palette-a')).toBeNull()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onClose).toHaveBeenCalled()
    expect(items[2].run).toHaveBeenCalled()
  })

  it('arrow keys move, Escape closes without reaching the app', () => {
    const onClose = vi.fn()
    const appEscape = vi.fn()
    render(<CommandPalette items={items} onClose={onClose} />)
    const input = screen.getByTestId('palette-input')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByTestId('palette-b').closest('li').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(screen.getByTestId('palette-c').closest('li').getAttribute('aria-selected')).toBe('true')
    window.addEventListener('keydown', appEscape)
    fireEvent.keyDown(input, { key: 'Escape' })
    window.removeEventListener('keydown', appEscape)
    expect(onClose).toHaveBeenCalled()
    expect(appEscape).not.toHaveBeenCalled()
  })

  it('says when nothing matches', () => {
    render(<CommandPalette items={items} onClose={() => {}} />)
    fireEvent.change(screen.getByTestId('palette-input'), { target: { value: 'zzz' } })
    expect(screen.getByText('Nothing matches')).toBeTruthy()
  })
})

describe('shortcut', () => {
  it('Ctrl/Cmd+P opens the palette', () => {
    expect(shortcutFor({ key: 'p', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, DEFAULT_KEYS)).toBe('palette')
  })
})
