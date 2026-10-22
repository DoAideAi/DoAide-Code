import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CodeEditor, { EDITOR_THEMES, autoIndent, saveEditorTheme, savedEditorTheme } from './CodeEditor.jsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('autoIndent', () => {
  it('keeps the current indentation and deepens after an opener', () => {
    const code = 'if (x) {'
    expect(autoIndent(code, code.length)).toBe('\n  ')
    const nested = 'def f():\n    if x:'
    expect(autoIndent(nested, nested.length)).toBe('\n      ')
    const plain = '  return 1'
    expect(autoIndent(plain, plain.length)).toBe('\n  ')
    expect(autoIndent('x = 1', 5)).toBe('\n')
  })
})

describe('CodeEditor', () => {
  const setup = (value = '', props = {}) => {
    const onChange = vi.fn()
    render(<CodeEditor testid="ed" value={value} onChange={onChange} {...props} />)
    return { onChange, textarea: screen.getByTestId('ed') }
  }

  it('numbers every line', () => {
    setup('a\nb\nc')
    expect(screen.getByTestId('ed-lines').textContent).toBe('1\n2\n3')
  })

  it('auto-indents on Enter and indents on Tab', () => {
    const { onChange, textarea } = setup('if (x) {')
    textarea.setSelectionRange(8, 8)
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('if (x) {\n  ')
    cleanup()
    const second = setup('ab')
    second.textarea.setSelectionRange(1, 1)
    fireEvent.keyDown(second.textarea, { key: 'Tab' })
    expect(second.onChange).toHaveBeenCalledWith('a  b')
  })

  it('runs on Ctrl+Enter and leaves Shift+Tab to the keyboard', () => {
    const onRun = vi.fn()
    const { onChange, textarea } = setup('x', { onRun })
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    expect(onRun).toHaveBeenCalledOnce()
    fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('colors keywords and strings for the chosen theme', () => {
    const { textarea } = setup('return "hi"', { language: 'JavaScript', theme: 'Ocean' })
    const overlay = textarea.parentElement.querySelector('pre')
    const spans = [...overlay.querySelectorAll('span')]
    expect(spans.find((s) => s.textContent === 'return').className).toBe(EDITOR_THEMES.Ocean.keyword)
    expect(spans.find((s) => s.textContent === '"hi"').className).toBe(EDITOR_THEMES.Ocean.string)
  })

  it('remembers the theme choice, falling back to Classic', () => {
    expect(savedEditorTheme()).toBe('Classic')
    saveEditorTheme('Ocean')
    expect(savedEditorTheme()).toBe('Ocean')
    localStorage.setItem('doaide-editor-theme', 'nope')
    expect(savedEditorTheme()).toBe('Classic')
  })
})
