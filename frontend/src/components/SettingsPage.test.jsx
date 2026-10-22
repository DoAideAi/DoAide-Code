import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadKeys } from '../hooks/useShortcuts.js'
import { saveTheme, savedTheme } from '../theme.js'
import SettingsPage from './SettingsPage.jsx'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

const models = {
  tools: [],
  pinned: null,
  executors: [
    { name: 'ollama', tier: 0, usable: true },
    { name: 'claude-opus', tier: 3, usable: false },
  ],
}

describe('SettingsPage', () => {
  it('chooses the theme, and follows the header toggle', () => {
    render(<SettingsPage onClose={() => {}} />)
    expect(screen.getByTestId('theme-system').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByTestId('theme-light'))
    expect(savedTheme()).toBe('light')
    expect(screen.getByTestId('theme-light').getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByTestId('theme-system'))
    expect(savedTheme()).toBeNull()
    act(() => void saveTheme('dark')) // as the header toggle does
    expect(screen.getByTestId('theme-dark').getAttribute('aria-checked')).toBe('true')
  })

  it('chooses the default model among those that can run', () => {
    const onChoose = vi.fn()
    render(<SettingsPage models={{ ...models, pinned: 'ollama' }} onChooseModel={onChoose} onClose={() => {}} />)
    expect(screen.getByTestId('model-ollama').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('model-claude-opus').disabled).toBe(true)
    fireEvent.click(screen.getByTestId('model-auto'))
    expect(onChoose).toHaveBeenCalledWith('auto')
  })

  it('says when the models are not known yet, or cannot be changed now', () => {
    const { rerender } = render(<SettingsPage onClose={() => {}} />)
    expect(screen.getByText(/once your laptop reports/)).toBeTruthy()
    rerender(<SettingsPage models={models} onClose={() => {}} />)
    expect(screen.getByTestId('model-auto').disabled).toBe(true)
    expect(screen.getByText(/connected and idle/)).toBeTruthy()
  })

  it('rebinds a shortcut by pressing a key, refusing reserved ones', () => {
    render(<SettingsPage onClose={() => {}} />)
    const button = screen.getByTestId('shortcut-newChat')
    fireEvent.click(button)
    expect(button.textContent).toBe('Press a key…')
    fireEvent.keyDown(button, { key: 'c' })
    expect(screen.getByRole('alert').textContent).toMatch(/belongs to the browser/)
    fireEvent.keyDown(button, { key: 'j' })
    expect(loadKeys().newChat).toBe('j')
    expect(button.textContent).toMatch(/J$/)
    fireEvent.click(screen.getByTestId('shortcuts-reset'))
    expect(loadKeys().newChat).toBe('k')
  })

  it('turns a shortcut off and on', () => {
    render(<SettingsPage onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('shortcut-stop-on'))
    expect(loadKeys().stop).toBeNull()
    fireEvent.click(screen.getByTestId('shortcut-clear-on'))
    expect(loadKeys().clear).toBeNull()
    expect(screen.getByTestId('shortcut-clear').disabled).toBe(true)
    fireEvent.click(screen.getByTestId('shortcut-clear-on'))
    expect(loadKeys().clear).toBe('l')
  })
})
